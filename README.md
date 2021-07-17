# The server component of the Sandboxed Renderer

## Goals

1. learn and practice fp-ts and functional programming techniques
2. render any website in a sandboxed environment without any JavaScript arriving to the "viewer" side

See the [client component here](https://github.com/bfulop/sandboxclient)

## Architecture Overview

![1-first-request](https://user-images.githubusercontent.com/1718128/126048762-6e0e5d62-6b80-4864-a4ed-14b2de7637b9.png)

![3-throttling](https://user-images.githubusercontent.com/1718128/126048787-5a172847-2d7f-4f97-a360-9636d27649dc.png)



## ES Module support in Node.js

Need to add a `package.json` file in every `/es6/..` directory with:

```json
{
  "type": "module"
}
```

TODO: add some post `npm install` or `tsc` hook to add them...
