"use strict";

var system = require('system');

if (system.args.length !== 2) {
    console.log("Usage: phantomjs scandir.js DIRECTORY_TO_SCAN");
    phantom.exit(1);
}


var RenderUrlsToFile = function(urls, paths, goodUrls, callbackPerUrl, callbackFinal) {
    var getFilename, next, page, retrieve, webpage;
    webpage = require("webpage");
    page = null;
    next = function(status, url, file) {
        page.close();
        callbackPerUrl(status, url, file);
        return retrieve();
    };
    retrieve = function() {
        var url;
        var path;
        if (urls.length > 0) {
            path = paths.shift();
            url = urls.shift();
            page = webpage.create();
            page.viewportSize = {
                width: 800,
                height: 600
            };
            page.settings.userAgent = "Phantom.js bot";
            return page.open("http://" + url, function(status) {
                var file;
                file = path;
                if (status === "success") {

                    var coords = page.evaluate(function() {
                            var box = document.querySelector('#myCanvas');
                            if(box === null){
                                //canvas doesn't exist probably an empty image
                                return false;
                            };
                            return { x: box.offsetLeft, y: box.offsetTop, w: box.offsetWidth, h: box.offsetHeight};
                    });
                    if(coords === false){
                        console.log("Error: " + path + " html doesn't have canvas ID");
                        return next("failed", url, file);
                    }
                    page.sendEvent('mousemove', coords.x + coords.w/2, coords.y + coords.h/2);

                    return window.setTimeout((function() {
                        page.render(file);
                        return next(status, url, file);
                    }), 200);
                } else {
                    return next(status, url, file);
                }
            });
        } else {
            return callbackFinal();
        }
    };
    return retrieve();
};


var urls = [];
var paths = [];
var goodUrls = {};

var dirAvoid = [".", "..", "libs", "imgs", "00-template", "01-start", "02-animation"];
var scanDirectory = function (path) {
    var fs = require('fs');

    if (fs.exists(path) && fs.isFile(path)) {
        if(path.split("/").slice(-1)[0] == "index.html"){
                console.log(path);
                if(path.split("/").length < 6){
                    console.log("ERROR PATH---------------- > ",path);
                    //phantom.exit(1);
                }
                var userName = path.substring(path.indexOf("home"), path.indexOf("WWW")).replace("home", "");
                userName = userName.split("/").join("");
                console.log(userName);
//                var sketchName = path.split("/").slice(-2)[0]; //antepenultimo elemento
                var sketchName = path.substring(path.indexOf("WWW"),path.indexOf("index.html")).replace("WWW/", "");
                console.log(sketchName);
                var url = userName + ".flab.space/" + sketchName;
                console.log(url);
                var output = path + ".png";
                urls.push(url);
                paths.push(output);
        }
    } else if (fs.isDirectory(path)) {
        fs.list(path).forEach(function (e) {
            if ( dirAvoid.indexOf(e) == -1) {    //Avoiding list of undesirable dirs
                scanDirectory(path + '/' + e);
            }
        });
        }
    };

var generateHTML = function(urls){
    var ejs = require('ejs');
    var fs = require('fs');
    var html = "";
    var html = fs.open('index.ejs', {
        mode: 'r',
        charset: 'utf8'
    });
    for(var u in goodUrls){
        urls[u].forEach(function(url){
            console.log(url);
        });
    }
    html = html.read();
    html = ejs.render(html, {urls: urls});
    fs.write("../../WWW/index.html", html, "w");
};

scanDirectory(system.args[1]);

RenderUrlsToFile(urls, paths, goodUrls, (function(status, url, file) {
    if (status !== "success") {
        return console.log("Unable to render '" + url + "'");
    } else {
        var user = url.split(".")[0];
        if(goodUrls.hasOwnProperty(user) === false){
            goodUrls[user] = [];
            goodUrls[user].push(url);
        }else{
            goodUrls[user].push(url);
        }
        return console.log("Rendered '" + url + "' at '" + file + "'");
    }
}), function() {
    generateHTML(goodUrls);
    phantom.exit();
});



