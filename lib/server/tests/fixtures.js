import MongooseModel from 'server/models/MongooseModel';
import {ref} from 'server/utils';

let schemas = {
  'Album': [{title: String, photos: [ref('Photo')]}],
  'Photo': [{url: String, album: ref('Album', 'photos')}]
};

export var models = MongooseModel.factory(schemas);

export var config = {
  express: () => {}
};

export default {models, config};
