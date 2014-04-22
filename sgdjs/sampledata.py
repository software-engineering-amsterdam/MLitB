import simplejson

from sklearn import datasets
import numpy as np


x,y = datasets.make_classification(1500)

x = np.hstack((np.ones((x.shape[0],1)),x))

print simplejson.dumps(y.tolist())