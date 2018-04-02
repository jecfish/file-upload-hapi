import { Server } from 'hapi';
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
const app = new Server({
    port: 3001,
    host: 'localhost',
    routes: {
        cors: true
    }
});

app.route({
    method: 'POST',
    path: '/profile',
    options: {
        payload: {
            output: 'stream',
            allow: 'multipart/form-data'
        }
    },
    handler: async function (request, h) {
        try {
            const data = request.payload;
            const file = data['avatar'];

            const fileDetails = await uploader(file, fileOptions);
            const col = await loadCollection(COLLECTION_NAME, db);
            const result = col.insert(fileDetails);

            db.saveDatabase();
            return { id: result.$loki, fileName: result.filename, originalName: result.originalname };
        } catch (err) {
            return Boom.badRequest(err.message, err);
        }
    }
});

app.route({
    method: 'POST',
    path: '/photos/upload',
    options: {
        payload:{
            output: 'stream',
            allow: 'multipart/form-data'
        }
    },
    handler: async (request, h) => {
        try {
            const data = request.payload;
            const files = data['photos'];

            const filesDetails = await uploader(files, fileOptions);
            const col = await loadCollection(COLLECTION_NAME, db);
            const result = [].concat(col.insert(filesDetails));

            db.saveDatabase();
            return result.map(x => ({ id: x.$loki, fileName: x.filename, originalName: x.originalname }));
        } catch (err) {
            return Boom.badRequest(err.message, err);
        }
    }
});

app.route({
    method: 'GET',
    path: '/images',
    handler: async (request, h) => {
        try {
            const col = await loadCollection(COLLECTION_NAME, db);
            return col.data;
        } catch (err) {
            return Boom.badRequest(err.message, err);
        }
    }
});

app.route({
    method: 'GET',
    path: '/images/{id}',
    handler: async (request, h) => {
        try {
            const col = await loadCollection(COLLECTION_NAME, db)
            const result = col.get(+request.params['id']);

            if (!result) {
                return Boom.notFound();
            };

            return fs.createReadStream(path.join(UPLOAD_PATH, result.filename));
        } catch (err) {
            return Boom.badRequest(err.message, err);
        }
    }
});

const init = async () => {
    await app.start();
    console.log(`Server running at: ${app.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();