import {ObjectId} from "bson";
import {EnhancedOmit, InferIdType, WithId} from "mongodb";


declare module 'mongodb' {
  export type OptionalId<TSchema> = TSchema extends {
    _id?: any;
  } ? ObjectId extends TSchema['_id'] ? EnhancedOmit<TSchema, '_id'> & {
    _id?: InferIdType<TSchema> | string;
  } : WithId<TSchema> : EnhancedOmit<TSchema, '_id'> & {
    _id?: InferIdType<TSchema> | string;
  };
}