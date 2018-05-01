[![logo](http://www.tango-controls.org/static/tango/img/logo_tangocontrols.png)](http://www.tango-controls.org)

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/512287ad5da94ac7af157a94eec80c5a)](https://www.codacy.com/app/tango-controls/tango-webapp?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=tango-controls/tango-webapp&amp;utm_campaign=Badge_Grade)
[![codebeat badge](https://codebeat.co/badges/23388ba2-feda-479d-a8c8-abf68eb7b01a)](https://codebeat.co/projects/github-com-tango-controls-tango-webapp-master)
[![Build Status](https://travis-ci.org/tango-controls/tango-webapp.svg?branch=master)](https://travis-ci.org/tango-controls/tango-webapp)

[![Docs](https://img.shields.io/badge/Generated-Docs-green.svg)](https://tango-controls.github.io/tango-webapp/)

[![release](https://img.shields.io/github/release/tango-controls/tango-webapp.svg?style=flat)](https://github.com/tango-controls/tango-webapp/releases/latest)

This project is an attempt to implement Tango Controls Roadmap Feature Request #6, see [Tango Controls Roadmap](http://www.tango-controls.org/about-us/feature-requests/)

## SonarCloud


[![Lines Of Code](https://sonarcloud.io/api/badges/gate?key=org.tango-controls:TangoWebapp)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)

[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=ncloc)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)
[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=coverage)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)
[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=sqale_debt_ratio)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)

[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=bugs)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)
[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)
[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=code_smells)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)
[![Lines Of Code](https://sonarcloud.io/api/badges/measure?key=org.tango-controls:TangoWebapp&metric=duplicated_lines_density)](https://sonarcloud.io/dashboard?id=org.tango-controls%3ATangoWebapp)

## Live demo

Watch this app running on Amazon cloud: [link](http://ec2-35-156-104-8.eu-central-1.compute.amazonaws.com:8080/master/)

User: tango-cs
Pass: tango

## Requirements ##

* Tango Controls environment (tested on Tango 8 and Tango 9)
* Tango REST Server that supports API spec version rc4 (tested on [mtangorest.server-rc4-2.4](https://bintray.com/ingvord/generic/mtangorest.server/rc4-2.4))
* Web server that can handle .war files (tested on Apache Tomcat 8)

## Getting started ##

1. Download the latest [TangoWebapp.war](https://github.com/tango-controls/tango-webapp/releases) file.
2. Copy it into your webserver's web applications root folder, e.g. {CATALINA_HOME}/webapps
3. Define a tomcat user who has the role "mtango-rest".
4. Restart server
5. Open browser and navigate to <your_host>/TangoWebapp
6. Adjust TANGO_REST_URL (must point to a valid Tango REST server, e.g. `http://{host}:{port}/tango/rest`) and TANGO_HOST values in the left top corner of the app
7. Press refresh button
8. Explore your Tango devices...

## Build ##

This project uses jmvcc for high level build operations:

```bash
$> ./jmvcc jmvc/clean
$> REST_API_PROTOCOL=[http|https] REST_API_HOST=[localhost] REST_API_PORT=[10001]  \
   TANGO_HOST=[localhost] TANGO_PORT=10000 \
   ./jmvcc jmvc/assemble
```

This requires jjs to be in the $PATH (is shipped with OpenJDK8 and later)

## Implementation details ##

* [JavaScriptMVC-1.5.x](https://bitbucket.org/Ingvord/javascriptmvc-1.5.x) is used for MVC implementation
* [Webix](http://webix.com) is used for UI
* [CodeMirror](https://codemirror.net/) is used for scripting console
* [Plotly](https://plot.ly/javascript/) is used to display plots and images
