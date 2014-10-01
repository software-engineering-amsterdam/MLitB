import cPickle
import numpy as np
# from scipy.misc import imsave
import json
import os
from scipy import misc
def unpickle(file):  
  fo = open(file, 'rb')
  dict = cPickle.load(fo)
  fo.close()
  return dict

def load_label_names(fname):
  R = open( fname ).readlines()
  index2name = {}
  for r in R:
    if r[0] != "#":
      idxstr,nm = r.split(',')
      idx = int(idxstr)
      index2name[ idx ] = nm.rstrip("\n").replace(" ","")
  return index2name
  
# copied from https://github.com/fivejjs/nb_IBP/blob/master/featex.py
def cifar():
    """file with [32*32, 32*32, 32*32] rgb
    
    """
    fname = ['data_batch_1',
             'data_batch_2',
             'data_batch_3',
             'data_batch_4',
             'data_batch_5',
             'test_batch']
    
    ffolder = u'/home/jisun/workspace/pycode/imagesclass'
    imdict = []
    for i in fname:
        imdict.append(unpickle(osp.join(ffolder, i)))
        
    count = 0
    tmp = []   
    cls = range(10)
    #check imdict[0]
    print len(imdict[5]['data'])
    for i, l in enumerate(imdict[0]['labels']):
        if (l in cls) and (l not in tmp):
            tmp.append(l)
            pl.subplot(2,5, count)   
            imag =  imdict[0]['data'][i]
            imagrgb = np.zeros((32,32,3))
            imagr = np.reshape(imag[:1024], (32,32))
            imagg = np.reshape(imag[1024:2*1024], (32,32))
            imagb = np.reshape(imag[2*1024:], (32,32))
            
            imagrgb[:,:,0] = imagr
            imagrgb[:,:,1] = imagg
            imagrgb[:,:,2] = imagb
            
            misc.imsave('imgsampel_%g.png'%l, imagr)
            
            pl.title(l)
            pl.imshow(imagrgb/256.)
            count += 1
        if len(tmp) >= 10:
            break
    pl.show()

def process_image( imag, filesavename ):
  imagrgb = np.zeros((32,32,3))
  imagr = np.reshape(imag[:1024], (32,32))
  imagg = np.reshape(imag[1024:2*1024], (32,32))
  imagb = np.reshape(imag[2*1024:], (32,32))
  
  imagrgb[:,:,0] = imagr
  imagrgb[:,:,1] = imagg
  imagrgb[:,:,2] = imagb
  
  misc.imsave(filesavename, imagrgb)
        
if __name__ == "__main__":
  
  output_dir = "./images/"
  
  idx2name = load_label_names("../label_names.txt")

  cifar = unpickle('train')

  data      = cifar['data']
  label     = cifar['fine_labels']
  filenames = cifar['filenames']
  
  for i in xrange(len(data)):
    label_idx  = label[i]
    label_name = idx2name[label_idx]
    filename   = filenames[i]
    
    image_dir =  output_dir + label_name
    
    if os.path.exists( image_dir ) is False:
      os.mkdir( image_dir )
    
    filesavename = image_dir + '/' + label_name + "_" + filename
    
    process_image( data[i], filesavename )
    print filesavename