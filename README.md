### What is MLitB?
Machine Learning in the Browser (MLitB, <http://software-engineering-amsterdam.github.io/MLitB/>) is an ambitious software development project whose aim is to bring ML, in all its facets, to an audience that includes both the general public and the research community.  MLitB is not just a software library, but is a philosophical approach to achieving our goals of bringing powerful machine learning models to a global audience.

#### Why Machine Learning in the Browser?
The ubiquity of the browser as a computational engine makes it an ideal platform for the development of massively distributed and collaborative machine learning.  

To accomplish this, we have written a lightweight software library that runs in native browsers, which is capable of performing massively distributed machine learning on heterogeneous devices (desktops, laptops, smart phones and tablets), embedding ML models into the devices for both prediction and collaborative learning initiatives,  be shared as an encapsulated object containing configurations, code, and parameters.

Implications of this software paradigm include truly collaborative machine learning, open to the public, real privacy preserving computation, field experiments, green computing, and more.

### Installation

#### Servers

To install, clone the MLitB repository.  Then use the `node.js` package manager `npm` to install the required packages.  MLitB uses two servers, a master Machine Learning server (MLitB) and a data server (that for now only handled zipped image directories).

```
$ cd MLitB/MLitB
$ npm i
$ cd MLitB/imagezip
$ npm i
```

The data server uses `redis` to organize data vectors; download and installation information can be found at <http://redis.io/download>.

#### Clients

Clients do not require any software installation beyond a browser.  

### Running MLitB
 
#### Start the servers

In a terminal, start redis
```
$ redis-server &
```

Start the Machine Learning server.  From the `MLitB/MLitB` directory, start the `node` application:
```
$ node app.js -h mlitb_host
```

Start the Data server.  From the `MLitB/imagezip` directory, start the `node` application:
```
$ node app.js  -h mlitb_host
```
Now open a tab in your browser to <http://mlitb_host:8000> (without specifying the host url the default is <http://localhost:8000/>).  Note that the data server will be running on port 8001.

#### Create a new project

Click <http://localhost:8000/#/new-project>.  Select a preconfigured Neural Network from the selection on the right.  Add a name and select an *iteration time*.  The iteration time is the length in msecs of a synchronized event loop.  During an event loop, the ML server and its clients perform MapReduce step, along with other events such as data uploading/downloading, client joining/leaving, etc.  Click *Add Neural Network* and a new NN will be added to the project list.

From the project list, click the new NN.  From this view you can upload data, modify hyperparameters, and add slave nodes.

#### Image data

MLitB is a prototype based on image classification.  The only data types understood at the moment are images (jpeg/png) that can be uploaded in zipped directory structure.  For example, files can be organised like `/dataset/cat/cat1.jpg`, `/dataset/dog/dog1.jpg`, etc;  these files should be compressed to `dataset.zip`.  Then select `dataset.zip` when uploading data.  MLitB will automatically assign labels `cat` and `dog` to the data vectors.  Note that you can upload data of any size; the images will be cropped automatically based on the dimensions of the first layer of the NN.

#### Training

To train, click `Add Slave`, then choose `train` for their task.  Click `Restart` to begin training.

### Authors and Contributors
MLitB is a collaborative effort between researchers at the University of Amsterdam with support from Amsterdam Data Science.

* Ted Meeds `tmeeds@gmail.com`
* Remco Hendriks `remco@topnotchdevelopment.nl`
* Said al Faraby `said.al.faraby@gmail.com`
* Magiel Bruntink `magiel.bruntink@gmail.com`
* Max Welling `welling.max@gmail.com`

### MLitB Reference
Please cite MLitB whenever possible <http://arxiv.org/abs/1412.2432v1>.

