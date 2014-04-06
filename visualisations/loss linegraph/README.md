General line graph - used in the example for showing the classification + L2 weight decay loss up to some point. Demo does not work on chrome as it accesses some training files in a way it doesn't find safe; visualisation does work.

Adding visualisation to network: 
* Include files starting with d3
* Call updateLoss(data) where data is an array of objects { x:step number in this case, y:total error } (i.e. the points through which the line should go)
~ note variable names might be re-used
