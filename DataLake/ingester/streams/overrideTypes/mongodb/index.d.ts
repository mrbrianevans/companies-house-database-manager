import {ObjectId} from "bson";
import {EnhancedOmit, InferIdType, WithId} from "mongodb";

// trying to override _id to allow a string, but can't get it to work
declare module "mongodb" {
  export type OptionalId<TSchema> = TSchema extends {
    _id?: any;
  } ? ObjectId extends TSchema['_id'] ? EnhancedOmit<TSchema, '_id'> & {
    _id?: InferIdType<TSchema> | string;
  } : WithId<TSchema> : EnhancedOmit<TSchema, '_id'> & {
    _id?: InferIdType<TSchema> | string;
  };
}