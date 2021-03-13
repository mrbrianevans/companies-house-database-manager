import {CompanyProfileEvent} from "./eventTypes";
import {Pool} from "pg";

export const processCompanyEvent = async (jsonEvent: CompanyProfileEvent.CompanyProfileEvent, pool: Pool) => {
    const companyFromStream = {
        name: jsonEvent.data.company_name,
        number: jsonEvent.data.company_number,
        streetaddress: jsonEvent.data.registered_office_address.address_line_1 || '',
        county: jsonEvent.data.registered_office_address.region || '',
        country: jsonEvent.data.registered_office_address.country || '',
        postcode: jsonEvent.data.registered_office_address.postal_code || '',
        category: companyTypeConversion[jsonEvent.data.type],
        origin: jsonEvent.data.foreign_company_details ? jsonEvent.data.foreign_company_details.originating_registry.country : 'United Kingdom',
        status: jsonEvent.data.company_status,
        date: new Date(jsonEvent.data.date_of_creation)
        // sicCodes: jsonEvent.data.sic_codes,
    }

    const {
        rows: companyFromDatabase,
        rowCount: companiesFoundInDatabase
    } = await pool.query('SELECT * FROM companies WHERE number=$1', [jsonEvent.data.company_number])
    //attempt to insert all companies, and if it already exists then update its details.
    await pool.query("INSERT INTO companies (name, number, streetaddress, county, country, postcode, category, origin, status, date) " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) " +
        "ON CONFLICT (number) DO UPDATE SET name=$1, streetaddress=$3, county=$4, country=$5, postcode=$6, category=$7, status=$9;",
        Object.values(companyFromStream))
        .catch(e => console.error("Could not insert company into database", e.toString()))
    if (companiesFoundInDatabase) {
        // compare details to see what changed
        const differences = {}
        for (const companyFromStreamKey in companyFromStream) {
            switch (companyFromStreamKey) {
                case 'date':
                    break; // date of creation can't change once its happened
                case 'streetaddress': // special comparison for street addresses
                    if (!String(companyFromStream[companyFromStreamKey]).toUpperCase().startsWith(String(companyFromDatabase[0][companyFromStreamKey]).toUpperCase()))
                        differences[companyFromStreamKey] = {
                            new: companyFromStream[companyFromStreamKey],
                            old: companyFromDatabase[0][companyFromStreamKey]
                        }
                    break;
                default:
                    if (String(companyFromStream[companyFromStreamKey]).toUpperCase() !== String(companyFromDatabase[0][companyFromStreamKey]).toUpperCase())
                        differences[companyFromStreamKey] = {
                            new: companyFromStream[companyFromStreamKey],
                            old: companyFromDatabase[0][companyFromStreamKey]
                        }
                    break;
            }
        }
        await pool.query("INSERT INTO company_events (id, company_number, fields_changed, published, new, timepoint) VALUES ($1, $2, $3, $4, $5, $6)",
            [jsonEvent.resource_id, companyFromStream.number, differences, jsonEvent.event.published_at, false, jsonEvent.event.timepoint])
            .catch(e => console.error("Could not insert event into database", e.toString()))
        // if (Object.keys(differences).length > 0) {
        //   if (differences['streetaddress'] && differences['postcode'])
        //     await pool.query("UPDATE companies SET streetaddress=$1, county=$2, country=$3, postcode=$4 WHERE number=$5",
        //       [companyFromStream.streetaddress, companyFromStream.county, companyFromStream.country, companyFromStream.postcode, companyFromStream.number])
        // }
        //     console.log("Address changed from ", companyFromDatabase[0].streetaddress, 'to', companyFromStream.streetaddress)
        //   else console.log("Differences found in company", companyFromStream.number, differences)
        // } else console.log("No differences found between stream and database for company", companyFromStream.number)
    } else {
        // console.log("Potential new company? ", companyFromStream.number, companyFromStream.date)
        await pool.query("INSERT INTO company_events (id, company_number, fields_changed, published, new, timepoint) VALUES ($1, $2, $3, $4, $5, $6)",
            [jsonEvent.resource_id, companyFromStream.number, null, jsonEvent.event.published_at, true, jsonEvent.event.timepoint])
            .catch(e => console.error("Could not insert event into database", e.toString()))
        // insert this company
        // await pool.query("INSERT INTO companies (name, number, streetaddress, county, country, postcode, category, origin, status, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", Object.values(companyFromStream))
        // .catch(e => console.error("Could not insert company into database", e.toString()))
    }
}

const companyTypeConversion = {
    'private-unlimited': "Private unlimited company",
    'ltd': "Private limited company",
    'plc': "Public limited company",
    'old-public-company': "Old public company",
    'private-limited-guarant-nsc-limited-exemption': "Private Limited Company by guarantee without share capital, use of 'Limited' exemption",
    'limited-partnership': "Limited partnership",
    'private-limited-guarant-nsc': "Private limited by guarantee without share capital",
    'converted-or-closed': "Converted / closed",
    'private-unlimited-nsc': "Private unlimited company without share capital",
    'private-limited-shares-section-30-exemption': "Private Limited Company, use of 'Limited' exemption",
    'protected-cell-company': "Protected cell company",
    'assurance-company': "Assurance company",
    'oversea-company': "Overseas company",
    'eeig': "European economic interest grouping (EEIG)",
    'icvc-securities': "Investment company with variable capital",
    'icvc-warrant': "Investment company with variable capital",
    'icvc-umbrella': "Investment company with variable capital",
    'registered-society-non-jurisdictional': "Registered society",
    'industrial-and-provident-society': "Industrial and Provident society",
    'northern-ireland': "Northern Ireland company",
    'northern-ireland-other': "Credit union (Northern Ireland)",
    'llp': "Limited liability partnership",
    'royal-charter': "Royal charter company",
    'investment-company-with-variable-capital': "Investment company with variable capital",
    'unregistered-company': "Unregistered company",
    'other': "Other company type",
    'european-public-limited-liability-company-se': "European public limited liability company (SE)",
    'uk-establishment': "UK establishment company",
    'scottish-partnership': "Scottish qualifying partnership",
    'charitable-incorporated-organisation': "Charitable incorporated organisation",
    'scottish-charitable-incorporated-organisation': "Scottish charitable incorporated organisation",
    'further-education-or-sixth-form-college-corporation': "Further education or sixth form college corporation"
}
