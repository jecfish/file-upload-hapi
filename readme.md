# File upload with Node, Hapi, Typescript

Please refer to tutorial https://scotch.io/bar-talk/handling-file-uploads-with-hapi-js.

1. Install [nodejs](https://nodejs.org/en/) (version 8.9+) and [yarn](https://yarnpkg.com/en/docs/install).
2. Go to project directory, run `yarn`.
3. Start the application, run `yarn start`.
4. Go to `localhost:3001`

## API End Points

1. Upload an image via `localhost:3001/profile`, avatar field.
2. Bulk Upload images via `localhost:3001/photos/upload`, photos field.
3. View list of images via `localhost:3001/images`.
4. Get a single image via `localhost:3001/images/{imageId}`.

# Changes
- 2018-04-02: Update to use latest hapi v17. Breaking changes.