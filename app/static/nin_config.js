var conf = []
conf.push({type : 'input', sx : 224, sy:224, depth :3});
conf.push({type : 'conv', sx : 11, stride : 4, filters : 96, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 96, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 96, activation : 'relu', is_train:'yes'});
conf.push({type : 'pool', sx : 3, stride : 2});
conf.push({type : 'conv', pad:2, sx : 5, stride : 1, filters : 256, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 256, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 256, activation : 'relu', is_train:'yes'});
conf.push({type : 'pool', sx : 3, stride : 2});
conf.push({type : 'conv', pad:1, sx : 3, stride : 1, filters : 384, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 384, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 384, activation : 'relu', is_train:'yes'});
conf.push({type : 'pool', sx : 3, stride : 2, drop_prob : 0.5});
conf.push({type : 'conv', pad:1, sx : 3, stride : 1, filters : 1024, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 1024, activation : 'relu', is_train:'yes'});
conf.push({type : 'conv', sx : 1, stride : 1, filters : 1000, activation : 'relu', is_train:'yes'});
conf.push({type : 'pool', sx : 6, stride : 1, pool_type:'avg'});
conf.push({type : 'softmax'});