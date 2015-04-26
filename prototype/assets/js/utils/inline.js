var Inline = {
	
	ease: {
		easeOutCubic:   'cubic-bezier(.215,.61,.355,1)',
	    easeInOutCubic: 'cubic-bezier(.645,.045,.355,1)',
	    easeInCirc:     'cubic-bezier(.6,.04,.98,.335)',
	    easeOutCirc:    'cubic-bezier(.075,.82,.165,1)',
	    easeInOutCirc:  'cubic-bezier(.785,.135,.15,.86)',
	    easeInExpo:     'cubic-bezier(.95,.05,.795,.035)',
	    easeOutExpo:    'cubic-bezier(.19,1,.22,1)',
	    easeInOutExpo:  'cubic-bezier(1,0,0,1)',
	    easeInQuad:     'cubic-bezier(.55,.085,.68,.53)',
	    easeOutQuad:    'cubic-bezier(.25,.46,.45,.94)',
	    easeInOutQuad:  'cubic-bezier(.455,.03,.515,.955)',
	    easeInQuart:    'cubic-bezier(.895,.03,.685,.22)',
	    easeOutQuart:   'cubic-bezier(.165,.84,.44,1)',
	    easeInOutQuart: 'cubic-bezier(.77,0,.175,1)',
	    easeInQuint:    'cubic-bezier(.755,.05,.855,.06)',
	    easeOutQuint:   'cubic-bezier(.23,1,.32,1)',
	    easeInOutQuint: 'cubic-bezier(.86,0,.07,1)',
	    easeInSine:     'cubic-bezier(.47,0,.745,.715)',
	    easeOutSine:    'cubic-bezier(.39,.575,.565,1)',
	    easeInOutSine:  'cubic-bezier(.445,.05,.55,.95)',
	    easeInBack:     'cubic-bezier(.6,-.28,.735,.045)',
	    easeOutBack:    'cubic-bezier(.175, .885,.32,1.275)',
	    easeInOutBack:  'cubic-bezier(.68,-.55,.265,1.55)'
	},
	
	applyTransform: function($elem, transform, properties) {
		if(typeof $elem === 'undefined')
		{
			return;
		}

		var hasDefaultProps = true;

		if(typeof properties === 'undefined')
		{
			hasDefaultProps = false;
		}

		var styles = transform.split(';');
		styles.pop();

		this.removeTransform($elem, styles);

		$elem.attr("style", function(index, attr) {

			for(var i = 0; i < styles.length; i++)
			{
				attr = attr + " " + Prefix.css + styles[i].replace(/^\s+/, '')+';';
			}
			
			return (hasDefaultProps) ? attr + properties : attr;
		});
	},

	applyTransition: function(elem, property, duration, timing, delay) {
		
		if(typeof elem === undefined)
		{
			return;
		}
		
		this.removeTransition(elem);
		
		var that = this;
		var trans = this.getTransition(property, duration, timing, delay);
		
		$(elem).attr("style", function(index, attr) {
			
			return attr + " " + trans;
			
		});
		
		$(elem).bind('transitionend webkitTransitionEnd oTransitionEnd otransitionend', function(event) {
			
			if(event.target == event.currentTarget)
			{
				that.removeTransition(this);
			}
		});
	},
	
	getTransition: function(property, duration, timing, delay) {
		
		if(!this.initialized)
		{
			this.init();
		}
		
		if(typeof property === undefined) {
			property = "all";
		}
		
		if(property === "transform") {
			property = prefix+"transform";
		}
		
		if(typeof duration === undefined) {
			duration = "1s";
		}
		
		if(typeof timing === undefined) {
			timing = "linear";
		}
		
		if(typeof delay === undefined) {
			delay = "0s";
		}
		
		return Prefix.css+"transition: "+property+" "+duration+" "+timing+" "+delay+"; ";
	},
	
	removeTransform: function(elem, styles) {
		
		if(typeof elem === undefined || typeof styles === undefined)
		{
			return;
		}
		
		var that = this;

		$(elem).attr("style", function(index, attr) {
			
			if(typeof attr === 'undefined') {
				return "";
			}

			for(var i = 0; i < styles.length; i++)
			{
				var p = styles[i].replace(/^\s+/, '');
				var p1 = 0;
				var p2 = p.indexOf(':');
				var prop = p.substring(p1, p2);

				var i1 = attr.indexOf(Prefix.css+prop);

				if(i1 == -1)
					continue;
				
				var i2 = attr.indexOf(';', i1) + 1;

				if(i2 == -1)
					continue;
				
				var str = attr.substring(i1, i2);
				attr = attr.replace(str, "");
			}

			return attr;
		});
		
	},

	removeTransition: function(elem) {
		
		if(typeof elem === undefined)
		{
			return;
		}
		
		var that = this;
		
		$(elem).attr("style", function(index, attr) {
			
			if(typeof attr === 'undefined') {
				return "";
			}
			
			var i1 = attr.indexOf(Prefix.css+'transition');
			
			if(i1 == -1) {
				return attr;
			}
			
			var i2 = attr.indexOf(';', i1) + 1;
			
			if(i2 == -1) {
				return attr;
			}
			
			var str = attr.substring(i1, i2);
			
			return attr.replace(str, "");
		});
		
	}
	
}