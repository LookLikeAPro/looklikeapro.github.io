---
layout: post
title:  "Web Apps with ReactJS and Laravel"
date:   2015-09-01 22:11:40 -0500
categories: posts
---
I like scaffolding applications, so I decided to make something cool. It took a lot longer than I had hoped, but the end result made it all worthwhile.

I plan to share the scaffolding soon, but it still involves refining some details and stripping out business logic of my own app.

The goals of the project:

1. Single Page Web App

    All the cool kids use some sort of client side MVC nowadays, the staple feature of a modern web 2.0 site. There shall be no jQuery or other AJAX to load partial html from the server either, the javascript is often not structured enough with this method and it becomes problematic as the project grows bigger.

2. Prerendered Pages

    I want a single page web app that renders on the server side first, and does subsequent page updates with client side MVC. It has advantages such as (1.)Automatic SEO, there is no need to worry about web crawlers not understanding Javascript. (2.)Allow the use of the website without Javascript turned on in browser. Obviously many features such as form submission will be broken, but the prerendered content should make browsing the site tolerable. (3.)Less API calls. Personally I hate the idea of web apps which start slowly, while bomboarding servers with tens of API calls to finish loading.

3. Client side build system

    The client side code, whether it is CSS or Javascript, should absolutely be very optimized. It needs preprocessing of some sort.

4. Live reloaded dev environment

    The client side code building should happen as soon as files are modified. Development should absolutely not be slowed by waiting for changes to reflect.

5. Light client-side bundle

    Ideally the client side code is under 1mb, and does not grow exponentially with the addition of new features.

6. Tightly coupled client and server side

    I don't want to have a web app where the server and client side are hopelessly decoupled. Like one of those node-angular projects where there are two folders - one labeled "client" and one "server". Ideally they should work better together. "Tighter coupling of client and server" sounds dumb, but in a prerendered site where they work closely together, it makes sense.

7. One Single backend solution (which is not node-express)

    I want a robust MVC backend written in a single framework, everything from caching, scheduled jobs, emailing, database migrations should all be there.

8. DRY server API

    The web app should share the same API as mobile and desktop apps, that almost certainly implies using JSON as the API interface and not doing any funny partial html stuff.


## Finalized App

Here is a rough layout of the app:

![dependency-map.jpg](/assets/react-laravel-dep.png)

### React Flux Frontend

ReactJS becomes the frontend framework of choice because of its speed and code reusability (components). React comes with great documentation and conventions that makes it hard to write bad code. My go-to front end framework is still AngularJS, but making a web app without angular features such as dependency injection and two-way binding is good programming practice and a worthy challenge for myself.

ReactJS is also one of the few frameworks capable of prerendering. With NodeJS, prerendering is as simple as writing `React.renderToString()`. There are extensions such as [react-rails](https://github.com/reactjs/react-rails) and [react-laravel](https://github.com/talyssonoc/react-laravel) for doing prerendering cleanly from the server side MVC framework, but in my experience they are [challenging to use](/how-not-to-build-web-apps).

The app uses Flux architecture for the frontend, which is a one way data flow that works like a minimalistic MVC. Instead of worrying about callbacks / promises, stores can provide synchonous access to data, greatly reducing frontend code complexity. I could go on about how great it is but [Facebook explains it better](https://facebook.github.io/flux/docs/overview.html).

### Webpack (frontend build system + live reloading)

The app uses Webpack as the build system. Whether it is css, less, jsx, js, coffeescript, html, webpack always sorts out the dependency, does preprocessing (babel and autoprefixer are the important ones for me) and builds properly. The stats-webpack-plugin even generates a file that gives insight to the the current build's dependency, size, speed, etc to help optimize. 

A surpringly powerful feature is the webpack-hot-reload extension, which caches the app bundle and watches for changes, only reloading parts of the app that changed.

I passed up one webpack feature - modularized css, because I believe css should be what it is - a cascading style sheet, not a component-specific / scoped styling descriptor.

I give credits to [react-starter](https://github.com/webpack/react-starter) for their Webpack configuration, which I modified to fit my needs. Alternatively, [here](http://christianalfoni.github.io/javascript/2014/08/15/react-js-workflow.html) is a gulp approach for people who can't get behind Webpack.

### Light client-side bundle

"react-proxy-loader" is a powerful webpack module loader that allows the configuration of less commonly used modules of the app to be packed in separate bundles. For example, the "about" page of the app can be as large as I want and not slow down the rest of the app.

This is my webpack setup for it:

    var asyncLoader = {
        test: require("./client-app/containers/async").map(function(name) {
            return path.join(__dirname, "client-app", "containers", name);
        }),
        loader: options.prerender ? "react-proxy-loader/unavailable" : "react-proxy-loader"
    };
    module.exports = {
        ...
        module: {
            loaders: [asyncLoader]
              .concat(loadersByExtension(loaders))
              .concat(loadersByExtension(stylesheetLoaders))
              .concat(additionalLoaders)
        },
        ...
    };

With this setup, any container/page that I write down in `client-app/containers/async.js` will be packed in separate modules.

The main app bundle includes core pages, models and a few libraries, which is easily kept under 500kb for a reasonable app.

### Coupled client and server

As mentioned earlier, "Tighter coupling of client and server" sounds dumb, but in a prerendered site where they work closely together, it makes sense. Fortunately I was able to organize the folders in an reasonable way.

    app                //the laravel app folder
    bootstrap          //laravel bootstrap
    client-app         //reactjs app folder
    client-bootstrap   //entry point for prerenderred and live react app. A "magic folder" not touched in development
    client-server      //webpack and node configurations. A "magic folder" not touched in development
    config             //laravel configurations
    database           //laravel database
    public             //public files and compiled client side code
    resources          //laravel views & languages
    storage            //laravel caches
    tests              //phpunit API tests

### Laravel

The app uses Laravel as the backend, and NodeJS as the aid to do react prerender. The existence of Node is confusing for the developer, so I hid its existence as much as possible. There are two "margic folders" which contain Node and React configurations to handle prerendering, which are not touched during development. As for running webpack tasks, they are bundled into a symphony command, so developers can work on the project without having anything to do with Node.

The app has two modes: prerendered production site, and live reloaded dev site. Bundled commands such as `php artisan serve:bundle live` (runs live-reloaded dev site) and `php artisan serve:bundle prod` (runs prerendered prodcution site) abstract away unpleasant steps such as switching php app environment and using Node. 

### Prerendering

Here is the procedure for prerendering and a bad illustration to go along with it.

![dependency-map.jpg](/assets/react-laravel-prod.png)

1. Do internal API calls to make a JSON containing the information needed for prerendering (this is purely optional)
2. Execute a node script, which uses React.renderToString() method to do the prerendering on app bundle, with path and data passed in
3. In the return to client, append a script which puts data as a global javascript object. The client side code can then consume the object and avoid API calls on load.

The Laravel code which does the above steps:

    public function index() {
        $url = Request::path();
        $data = json_encode(['preloadedAPIData'=>'THIS IS FROM SERVER API',
            "currentUser" => $this->responseFormer->middleware(Auth::user())]);
        $prepend = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>var __StoreData = $data;</script>";
        $append = "</body></html>";
        echo $prepend;
        echo exec("node ../client-server/server-executed.js --path=$url --data=$data");
        echo $append;
    }

When the above information is turned over to client side, html and css will compose the page first. At the same time, the javascript bundle starts to execute, consuming the global `__StoreData` object to fill stores with data.The react rendering begins after. React virtual DOM makes sure the whole page does not flicker and only nodes that differ on the pre-render and client side render are changed. When the view first loads, pre-render and client side render are identical, making for a smooth transition from pre-render page to single page app.

The process of prerendering ended up being very roundabout, but the good thing is - prerendering is optional. For any information that the client side app wants and does not have, it will just make an extra API call. I can prerender information on the page if I want, but it is not necessary and not a slow down to development. 

### Live DEV Site

Webpack's hot dev server extension caches the app bundle and watches for changes, only reloading parts of the app that changed.

![dependency-map.jpg](/assets/react-laravel-dev.png)

The laravel side of things is extremely simple in this case, just pipe stuff over from the node-express dev server.

    public function index() {
        $url = preg_replace('/8000/', '8080', Request::url());
        $prepend = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>";
        $append = "</body></html>";
        $opts = stream_context_create([
            'http'=>[
                'method'=>"GET",
                'header'=>"Content-Type: multipart/form-data\r\n"
            ]
        ]);
        return response()->stream(function () use ($url, $opts, $prepend, $append) {
            $stream = fopen($url, 'r', false, $opts);
            fpassthru(fopen('data://text/plain;base64,' . base64_encode($prepend),'r'));
            fpassthru($stream);
            fpassthru(fopen('data://text/plain;base64,' . base64_encode($append),'r'));
        }, 200, []);
    }

### [Bonus round - previous failed attempts](/how-not-to-build-web-apps)
