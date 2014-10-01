import cPickle
import numpy as np
# from scipy.misc import imsave
import json
import pdb

def load_label_names(fname):
  R = open( fname ).readlines()
  index2name = {}
  for r in R:
    if r[0] != "#":
      idxstr,nm = r.split(',')
      idx = int(idxstr)
      index2name[ idx ] = nm.rstrip("\n").replace(" ","")
  return index2name
  
def unpickle(file):  
  fo = open(file, 'rb')
  dict = cPickle.load(fo)
  fo.close()
  return dict

index2name = load_label_names('../label_names.txt')
cifar = unpickle('train')

data = cifar['data']
label = cifar['fine_labels']

# data = data[:5]
# i=0
# total number of training data is 50000
# divide into smaller chunks
chunk_size = 1000 #
n_chunks = len(label)/chunk_size
idx=0
for i in range(n_chunks):
  print i
  new_dic = {}
  for j in range(chunk_size):
    d = list(np.int_(data[idx]))
    lbl=str(label[idx])
    lbl = index2name[int(lbl)]
    idx+=1
    try :
      new_dic[lbl].append(d)
    except:
      new_dic[lbl]=[d]
  js = json.dumps(new_dic)
  open('cifar_batch_'+str(i+1)+'.json','w').write(js)
  
# print len(label)
# for img in range(len(data)):
#   lab = label[img]
#   image = np.zeros((32,32,3), dtype=np.uint8)
#   idx=0
#   for c in range(3):
#     for r in range(32):
#       for col in range(32):
#         image[r][col][c]=data[img][idx]
#         idx+=1
#   imsave('orderedImages/'+`img`+'.jpeg',image)
  # i+=1


# xs = []
# ys = []
# for j in range(5):
#   d = unpickle('data_batch_'+`j+1`)
#   x = d['data']
#   y = d['labels']
#   xs.append(x)
#   ys.append(y)

# d = unpickle('test_batch')
# xs.append(d['data'])
# ys.append(d['labels'])

# x = numpy.concatenate(xs)
# y = numpy.concatenate(ys)

# x = numpy.dstack((x[:, :1024], x[:, 1024:2048], x[:, 2048:]))

# for i in range(50):
#   imsave('cifar10_batch_'+`i`+'.png', x[1000*i:1000*(i+1),:])
# imsave('cifar10_batch_'+`50`+'.png', x[50000:51000,:]) # test set

# # dump the labels
# L = 'var labels=' + `list(y[:51000])` + ';\n'
# open('cifar10_labels.js', 'w').write(L)

