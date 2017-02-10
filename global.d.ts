interface FileUploaderOption {
    dest: string;
    fileFilter?(fileName: string): boolean;
}

interface FileDetails {
    fieldname: string;
    originalname: string;
    filename: string;
    mimetype: string;
    destination: string;
    path: string;
    size: number;
}