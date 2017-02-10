import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as path from 'path'
import * as fs from 'fs';
import * as Loki from 'lokijs';
import * as uuid from 'uuid';
import {
    imageFilter, loadCollection, cleanFolder,
    uploader
} from './utils';

// setup
const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';
const fileOptions: FileUploaderOption = { dest: `${UPLOAD_PATH}/` };
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
        const data = request.payload;
        const file = data['avatar'];

        const fileDetails = await uploader(file, fileOptions);
        const col = await loadCollection(COLLECTION_NAME, db);
        const result = col.insert(fileDetails);

        db.saveDatabase();
        reply({ id: result.$loki, fileName: result.filename });
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
        const data = request.payload;
        const files = data['photos'];

        const filesDetails = await uploader(files, fileOptions);
        const col = await loadCollection(COLLECTION_NAME, db);
        const result = col.insert(filesDetails);

        db.saveDatabase();
        reply(result.map(x => ({ id: x.$loki, fileName: x.filename })));
    }
});

app.route({
    method: 'GET',
    path: '/images',
    handler: function (request, reply) {
        loadCollection(COLLECTION_NAME, db)
            .then(col => reply(col.data));
    }
});

app.route({
    method: 'GET',
    path: '/images/{id}',
    handler: async function (request, reply) {
        const col = await loadCollection(COLLECTION_NAME, db)
        const result = col.get(request.params['id']);

        if (!result) {
            reply(Boom.notFound());
            return;
        };

        reply(fs.createReadStream(path.join(UPLOAD_PATH, result.filename)))
            .header('Content-Type', result.mimetype);
    }
});