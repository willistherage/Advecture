var MathUtils = {

	/**
	 *	Clamps values.
	 */
	clamp: function(min, max, value)
	{
		return Math.max(Math.min(value, max), min);
	},

	/**
	 *	Tests to see if the value is in bounds.
	 */
	inbounds: function(min, max, value)
	{
		return !(value > max || value < min);
	},
	
	/**
	 *	Loops values
	 */
	loop: function(min, max, value)
	{
		var dif = max-min;
		var val;
		
		if(value < min)
		{
			val = (min - value) % dif;
			return max - val;
		}
		 else if(value > max)
		{
			val = (value - max) % dif;
			return min + val;
		}
		
		return value;
	},

	/**
	 *	Loops indicies
	 */
	loopIndex: function(min, max, value)
	{
		var dif = max - min;
		var val;
		
		if(value < min)
		{
			val = ((min - 1) - value) % dif;
			return max - val;
		}
		 else if(value > max)
		{
			val = (value - (max + 1)) % dif;
			return min + val;
		}
		
		return value;
	}

};

