Visualisation of decision boundaries and points in a 2D neural network classification. Add points of class 1 at a mouse click's location and points of class 2 by shift+click.

Adding visualisation to network: 
* Include files starting with d3
* Call updateBoundaries(points) function whenever the image has to be redrawn, where points is an array of objects { x:x position, y: y position, label: class }
* Implement addPoint(point) function in the file where the visualisation will be added describing how the learning algorithm takes into account a new point
~ note variable names might be re-used
