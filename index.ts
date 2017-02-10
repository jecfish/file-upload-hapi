import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as path from 'path'
import * as fs from 'fs';
import * as Loki from 'lokijs';

import {
    imageFilter, loadCollection, cleanFolder,
    uploader
} from './utils';

// setup
const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';
const fileOptions: FileUploaderOption = { dest: `${UPLOAD_PATH}/`, fileFilter: imageFilter };
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });

// optional: clean all data before start
// cleanFolder(UPLOAD_PATH);
if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH);

// app
const app = new Hapi.Server();
app.connection({
    port: 3001, host: 'localhost',
    routes: { cors: true }
});

app.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${app.info.uri}`);
});

app.route({
    method: 'POST',
    path: '/profile',
    config: {
        payload: {
            output: 'stream',
            allow: 'multipart/form-data'
        }
    },
    handler: async function (request, reply) {
        try {
            const data = request.payload;
            const file = data['avatar'];

            const fileDetails = await uploader(file, fileOptions);
            const col = await loadCollection(COLLECTION_NAME, db);
            const result = col.insert(fileDetails);

            db.saveDatabase();
            reply({ id: result.$loki, fileName: result.filename, originalName: result.originalname });
        } catch (err) {
            reply(Boom.badRequest(err.message, err));
        }
    }
});

app.route({
    method: 'POST',
    path: '/photos/upload',
    config: {
        payload: {
            output: 'stream',
            allow: 'multipart/form-data'
        }
    },
    handler: async function (request, reply) {
        try {
            const data = request.payload;
            const files = data['photos'];

            const filesDetails = await uploader(files, fileOptions);
            const col = await loadCollection(COLLECTION_NAME, db);
            const result = [].concat(col.insert(filesDetails));

            db.saveDatabase();
            reply(result.map(x => ({ id: x.$loki, fileName: x.filename, originalName: x.originalname })));
        } catch (err) {
            reply(Boom.badRequest(err.message, err));
        }
    }
});

app.route({
    method: 'GET',
    path: '/images',
    handler: async function (request, reply) {
        try {
            const col = await loadCollection(COLLECTION_NAME, db)
            reply(col.data);
        } catch (err) {
            reply(Boom.badRequest(err.message, err));
        }
    }
});

app.route({
    method: 'GET',
    path: '/images/{id}',
    handler: async function (request, reply) {
        try {
            const col = await loadCollection(COLLECTION_NAME, db)
            const result = col.get(request.params['id']);

            if (!result) {
                reply(Boom.notFound());
                return;
            };

            reply(fs.createReadStream(path.join(UPLOAD_PATH, result.filename)))
                .header('Content-Type', result.mimetype);
        } catch (err) {
            reply(Boom.badRequest(err.message, err));
        }
    }
});