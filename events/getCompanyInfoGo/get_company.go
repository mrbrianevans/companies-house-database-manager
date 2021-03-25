package get_company_info

import (
        "encoding/json"
        "fmt"
        "net/http"
//         "os"
        "database/sql"
        _ "github.com/lib/pq"
)

// const (
//     host     = os.Getenv("PGHOST")
//     port     = os.Getenv("PGPORT")
//     user     = os.Getenv("PGUSER")
//     password = os.Getenv("PGPASSWORD")
//     dbname   = os.Getenv("PGDATABASE")
// )
//todo: add more details here
type Company struct {
  name string
  number string
  streetaddress string
  county string
  country string
  postcode string
  category string
  origin string
  status string
  date string
  updated string
}
// GetCompanyInfo is an HTTP Cloud Function with a request parameter for company number
func GetCompanyInfo(w http.ResponseWriter, r *http.Request) {
        query := r.URL.Query()
        company_number := query.Get("company_number")
        //var d struct {
        //        CompanyNumber string `json:"company_number"`
        //}
        //if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
        //        fmt.Fprint(w, "Company number could not be read")
        //        return
        //}
        if company_number == "" {
            fmt.Println("Empty company number requested")
                fmt.Fprint(w, "Company number empty")
                return
        }

        //fmt.Println("Company number read from request: ", company_number)
        db, err := sql.Open("postgres", "")
        CheckError(err)

            // close database
        defer db.Close()

            // check db
        err = db.Ping()
        CheckError(err)

        rows, err := db.Query(`
SELECT name, number, streetaddress, 
       county, country, postcode, 
       category, origin, status, 
       date::text, updated::text
       FROM companies WHERE number = $1`, company_number)
        CheckError(err)

        var name string
        var number string
        var streetaddress string
        var county string
        var country string
        var postcode string
        var category string
        var origin string
        var status string
        var date string
        var updated string
        if rows.Next(){
        err = rows.Scan(&name, &number, &streetaddress, &county, &country, &postcode, &category, &origin, &status, &date, &updated)
        CheckError(err)
        fmt.Println("Name read from DB: ", name)
            fmt.Printf(`{"message": "Name read from DB: %s", "severity": "info", "company_number":"%s"}`, name, number)
        c := Company{name, number, streetaddress, county, country, postcode, category, origin, status, date, updated}
        defer rows.Close()
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(c)
        }
        fmt.Printf(`{"message": "%s", "severity": "warning"}`, "Company not found")
        fmt.Fprintf(w, "Company not found")
}
func CheckError(err error) {
    if err != nil {
            fmt.Printf(`{"message": "%s", "severity": "error"}`, err)
            panic(err)
    }
}
