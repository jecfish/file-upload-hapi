import * as del from 'del';
import * as Loki from 'lokijs';
import * as fs from 'fs';
import * as uuid from 'uuid';

const imageFilter = function (req, file, cb) {
    // accept image only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const loadCollection = function (colName, db: Loki): Promise<LokiCollection<any>> {
    return new Promise(resolve => {
        db.loadDatabase({}, () => {
            const _collection = db.getCollection(colName) || db.addCollection(colName);
            resolve(_collection);
        })
    });
}

const cleanFolder = function (folderPath) {
    // delete files inside folder but not the folder itself
    del.sync([`${folderPath}/**`, `!${folderPath}`]);
};

interface FileUploaderOption {
    dest: string;
    fileFilter?();
}

interface File {
    fieldname: string;
    originalname: string;
    filename: string;
    mimetype: string;
    destination: string;
    path: string;
    size: number;
}

const fileUploader = function (file: any, options: FileUploaderOption) {
    if (!file) throw new Error('no file');

    const orignalname = file.hapi.filename;
    const filename = uuid.v1();
    const path = `${options.dest}${filename}`;
    const fileStream = fs.createWriteStream(path);

    return new Promise((resolve, reject) => {
        file.on('error', function (err) {
            reject(err);
        });

        file.pipe(fileStream);

        file.on('end', function (err) {
            const fileDetails: File = {
                fieldname: file.hapi.name,
                originalname: file.hapi.filename,
                filename,
                mimetype: file.hapi.headers['content-type'],
                destination: `${options.dest}`,
                path,
                size: fs.statSync(path).size,
            }

            resolve(fileDetails);
        })
    })
}

const filesUploader = function (files: any[], options: FileUploaderOption) {
    if (!files || !Array.isArray(files)) throw new Error('no files');

    const promises = files.map(x => fileUploader(x, options));

    return Promise.all(promises);
}

export { imageFilter, loadCollection, cleanFolder, fileUploader }
