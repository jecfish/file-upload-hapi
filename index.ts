import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as path from 'path'
import * as fs from 'fs';
import * as Loki from 'lokijs';
import * as uuid from 'uuid';
import { imageFilter, loadCollection, cleanFolder, fileUploader } from './utils';

// setup
const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';
const fileOptions = { dest: `${UPLOAD_PATH}/` };
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });

// optional: clean all data before start
cleanFolder(UPLOAD_PATH);
if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH);

// app
const server = new Hapi.Server();
server.connection({ port: 3001, host: 'localhost' });

server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at: ${server.info.uri}`);
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, world!');
    }
});

server.route({
    method: 'POST',
    path: '/profile',
    config: {
        payload: {
            output: 'stream',
            // parse: true,
            allow: 'multipart/form-data'
        }
    },
    handler: async function (request, reply) {
        const data = request.payload;
        const file = data['avatar'];

        const fileDetails = await fileUploader(file, fileOptions);
        const col = await loadCollection(COLLECTION_NAME, db);
        const result = col.insert(fileDetails);

        db.saveDatabase();
        reply(result);
    }
});

server.route({
    method: 'POST',
    path: '/photos/upload',
    config: {

        payload: {
            output: 'stream',
            // parse: true,
            allow: 'multipart/form-data'
        },

        handler: function (request, reply) {
            const data = request.payload;
            const files: any[] = data.photos;
            const details: any[] = [];
            files.forEach(file => {
                if (file) {
                    const orignalname = file.hapi.filename;
                    const filename = uuid.v1();
                    const path = `${UPLOAD_PATH}/${filename}`;
                    const fileStream = fs.createWriteStream(path);

                    fileStream.on('error', function (err) {
                        console.error(err)
                    });

                    file.pipe(fileStream);

                    file.on('end', function (err) {
                        const fileDetails = {
                            fieldname: file.hapi.name,
                            originalname: file.hapi.filename,
                            filename,
                            mimetype: file.hapi.headers['content-type'],
                            destinatiion: `${UPLOAD_PATH}/`,
                            path,
                            size: fs.statSync(path).size,
                        }

                        loadCollection(COLLECTION_NAME, db).then(col => {
                            const r = col.insert(fileDetails);
                            db.saveDatabase();
                            details.push(r);
                            if (details.length === files.length) reply(details)
                        })
                    })
                }
            });
        }
    }
});

server.route({
    method: 'GET',
    path: '/images',
    handler: function (request, reply) {
        loadCollection(COLLECTION_NAME, db)
            .then(col => reply(col.data));
    }
});

server.route({
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