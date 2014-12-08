
function Test() {

}

Test.prototype.fail = function(text) {

	var text = (typeof text === "undefined") ? false : text;

	if(text) {
		console.log(' ** TEST ASSERTION FAILED:', text);
	} else {
		console.log(' ** TEST ASSERTION FAILED, no reason given.');
	}

}

Test.prototype.dataset_should_be_fully_allocated = function(nn) {

	var full_data_set = [];

	// first collect all the data ids assigned to the slaves. may contain duplicates.
	var i = nn.slaves_operating.length;
	while(i--) {

		// extends full_data_set with nn.slaves_operating[i].process
		Array.prototype.push.apply(full_data_set, nn.slaves_operating[i].process);

	}

	var count = 0;

	// check for each data point in NN if they exist in full_data_set
	var i = nn.data.length;
	while(i--) {

		if( full_data_set.indexOf( nn.data[i].id ) == -1) {

			//this.fail('Point not in allocated dataset: ' + nn.data[i].id);
			count += 1;

		}

	}

	if(count > 0) {
		this.fail('Number of points not in allocated dataset: ' + count);
	}

};

module.exports = Test;