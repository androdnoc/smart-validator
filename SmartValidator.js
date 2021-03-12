console.log("Smart Validator Loaded.")

// rule class.
// - rule is provided as a function which either returns true or false based on input.
// - error message is used upon false return.
// - usePreProcessor (defaults to true) is a flag to tell a validator to use the preprocessor on the input before checking the rule.
function Rule(name, rule, errorMessage, usePreProcessor) {

	// initialise variables
	this._name;
	this._rule;
	this._errorMessage;
	this._usePreProcessor;

	Object.defineProperties(this, {

		name: {
			get: () => { return this._name},
			set: (v) => {
				if(typeof v == "string") {
					this._name = v
				} else { throw new TypeError("Property 'name' must be of type string."); }
			}
		},

		rule: {
			get: () => { return this._rule},
			set: (v) => {
				if(v instanceof Function) {
					this._rule = v
				} else { throw new TypeError("Property 'rule' must be a function."); }
			}
		},

		errorMessage: {
			get: () => { return this._errorMessage},
			set: (v) => {
				if(typeof v == "string") {
					this._errorMessage = v
				} else { throw new TypeError("Property 'errorMessage' must be of type string."); }
			}
		},
		usePreProcessor: {
			get: () => { return this._usePreProcessor},
			set: (v) => {
				if(typeof v == "boolean") {
					this._usePreProcessor = v
				} else { throw new TypeError("Property 'usePreProcessor' must be of type boolean."); }
			}
		},
	});

	this.name = name;
	this.rule = rule;
	this.errorMessage = errorMessage;

	// useProcessor defaults to true.
	this.usePreProcessor = usePreProcessor != undefined ? usePreProcessor : true
	

	// tests given value against rule. rule must return bool.
	this.test = (v) => {
		if(typeof this.rule(v) == "boolean") {
			return this.rule(v)
		} else { throw new TypeError("A boolean value has not been returned. Please check your rule provides a 'true' or 'false' case.");  }
	}
}

function RuleFactory() {
	this.create = (type, value) => {
		switch(type) {
			case 'required':
				return new Rule('required', (input) => !!input, `Input is required.`, false)
				break;

			case 'min':
				return new Rule(`>= ${value}`, (input) => parseFloat(input) >= value, `Input must be greater than or equal to ${value}.`)
				break;

			case 'max':
				return new Rule(`<= ${value}`, (input) => parseFloat(input) <= value, `Input must be less than or equal to ${value}.`)
				break;

			case 'step':
				return new Rule(`${value} step`, (input) => {

					// parses value for floats.
					input = parseFloat(input);
					let step = value;

					// return number of decimal places given for value.
					function checkDecimals(num) {
						try {
							return Math.floor(num) == num ? 0 : num.toString().split(".")[1].length
						}
						catch {
							throw new TypeError("'step' cannot be tested on input which does not meet the correct format.")
						}
					}
					
					// returns false if more decimals are given in input than step
					// - Note: this needs to be checked as toFixed() is used later in code, which smaller values would otherwise slip through.
					if(checkDecimals(input) > checkDecimals(step)) return false

					// toFixed() used for resolving rounding errors.
					let check = parseFloat((input % step).toFixed(checkDecimals(step)));

					// value is equal to step in instances of rounding errors
					return (check == 0 || Math.abs(check) == step) ? true : false;

				}, `Input must be to the nearest ${value}.`);	
				break;
			default:
				throw new TypeError(`Rule '${type}' has not been found in the factory.`)
				break;
		}
	}	
}

let ruleFactory = new RuleFactory()

// smart validator class.
// - uses list of rules to test input value and return validation.
// - preprocessor can be used to convert input to final value to use for validation.
function SmartValidator(rules, preprocessor) {

	// initialised properties
	this._input;
	this._value;
	this._valid;
	this._errorMessage;

	// default poreprocessor, returns value as input.
	if(preprocessor != undefined) {
		this._preprocessor = preprocessor
	} else {
		this._preprocessor = (v) => v;
	}

	// rules to append
	this._rules = [];

	// define properties
	Object.defineProperties(this, {

		input: {
			get: () => { return this._input},
			set: (v) => {
				this._errorMessage = undefined;
				this._input = v

				this.test()
			}
		},

		value: {
			get: () => { return this._value},
			set: (v) => { /* pass, do not set. */ }
		},

		valid: {
			get: () => { return this._valid},
			set: (v) => { /* pass, do not set. */ }
		},

		rules: {
			get: () => { return this._rules},
			set: (v) => { /* pass, do not set. */ }
		},

		errorMessage: {
			get: () => { return this._errorMessage},
			set: (v) => { /* pass, do not set. */ }
		},

	})

	// push rules if given
	if(rules != undefined && rules.length > 1) {
		for(let i of rules) {
			this._rules.push(i)
		}
	}

	// adds rule to validator
	this.addRule = (rule) => {
		this._rules.push(rule);
	}

	// removes rules from array at index given
	this.removeRule = (index) => {
		this._rules.splice(index, 1);
	}

	// returns list of rule names
	this.getRuleNameList = () => {
		let ruleNames = []
		for(let i of this._rules) {
			ruleNames.push(i.name)
		}

		return ruleNames
	}

	// processed input and tests against given rules
	this.test = () => {

		// standard rules
		let rules = []

		// rules checked before preprocessor
		let preRules = []

		for(let [i, v] of this._rules.entries()) {
			v.usePreProcessor == false ? preRules.push(v) : rules.push(v)

		}

		// reset processed value
		this._value = undefined;

		let finalValue

		try {

			// input goes through preprocessor function before being tested.
			let finalValue = this._preprocessor(this.input)

			this._value = finalValue

			if(this._rules.length > 0) {

				// check prerules (non-preprocessed)
				for(let i of preRules) {
					if(!i.test(this._input)) {
						throw new TypeError(i.errorMessage);
					}
				}

				// check rules
				for(let i of rules) {
					if(!i.test(finalValue)) {
						throw new TypeError(i.errorMessage);
					}
				}

				// if all passed, return true
				this._valid = true;

			// no rules - always returns true
			} else {
				this._valid = true;
			}

		} catch(e) {
			this._errorMessage = e.message
			this._valid = false;
			throw e
		}
	}

	// resets all values for validator
	this.reset = () => {
		this._input = undefined;
		this._value = undefined;
		this._valid = undefined;
		this._errorMessage = undefined;
	}

	// initialise
	this.reset()

}


// preprocessor for converting given latlng notation into decimal value.

// checks for valid format:
	// 	- accepts degrees, with or without minutes and/or seconds,
	// 	- with or without direction (cannot have negative with direction),
	// 	- decimal values at deg, min, sec range
	// 	- comma or space seperated
	//	- dir can be whitespace seperated or not.
function latLngPreProcessor(input) {

	if(/^-? ?\d+(\.\d+)?([, ]\d+(\.\d+)?)?([, ]\d+(\.\d+)?)?( ?([NSWEnswe]))?$/.test(input)) {

		// checks that negative with dir hasn't been given
		if(/^((?!-).+[NSWEnswe]?|- ?[^NSWEnswe]+)$/.test(input)) {

			// split into components
			let vals = input.split(/[, ]/)
			let dir

			// checks final item in array contains dir
			if(/^[NSWEnsdwe]$/.test(vals[vals.length -1].slice(-1))) {

				// if final value and dir have not been seperated in split (user did not use whitespace between final value and dir)
				if(vals[vals.length -1].length > 1) {
					dir = vals[vals.length -1].slice(-1)
					vals[vals.length -1] = vals[vals.length -1].slice(0, -1)

				// otherwise just remove and assign
				} else {
					dir = vals.pop()
				}
			}

			// assign minutes and seconds to 0 if not found in components
			vals[1] = vals[1] == undefined ? 0 : vals[1]
			vals[2] = vals[2] == undefined ? 0 : vals[2]

			// add values
			let v = parseFloat(vals[0]) + (parseFloat(vals[1]) / 60) + (parseFloat(vals[2]) / 3600)

			// return *= -1 if south/west
			return /^[SWsw]$/.test(dir) ? (v * -1).toString() : v.toString()

		} else {
			throw new TypeError("Negative value cannot be given with direction notation.")
		}

	} else if(!!input) {
		throw new TypeError("Value format not supported.")
	}
}

function LatLonValidator() {
	SmartValidator.call(this, [required], latLngPreProcessor)
}

function LatValidator() {
	// rules
	required = ruleFactory.create('required')
	max = new Rule(`<= 89`, (input) => parseFloat(input) <= 89, `Latitude cannot be greater than 89.`)
	min = new Rule(`>= -89`, (input) => parseFloat(input) >= -89, `Latitude cannot be less than -89.`)
	NSOnly = new Rule('N/S only', (input) => /[^WEwe]$/.test(input), 'West/East values cannot be given for latitude.', false)

	// used to add additional range that latitude must fall between
	this.addRange = (n, s) => {
		this.removeRange()

		this.addRule(new Rule(`<= _boundary N ${n}`, (input) => parseFloat(input) <= n, `Latitude is greater than the N boundary of the selected model.`))
		this.addRule(new Rule(`>= _boundary S ${s}`, (input) => parseFloat(input) >= s, `Latitude is less than the S boundary of the selected model.`))
	}

	this.removeRange = () => {
		this._rules = this.rules.filter(rule => !rule.name.includes("_boundary"))
	}

	// extends SmartValidator
	SmartValidator.call(this, [required, NSOnly, min, max], latLngPreProcessor)
}


function LonValidator() {
	// rules
	required = ruleFactory.create('required')
	max = new Rule(`<= 360`, (input) => parseFloat(input) <= 360, `Longitude cannot be greater than 360.`)
	min = new Rule(`>= -180`, (input) => parseFloat(input) >= -180, `Longitude cannot be less than -180.`)
	WEOnly = new Rule('W/E only', (input) => /[^NSns]$/.test(input), 'North/South values cannot be given for longitude.', false)

	// used to add additional range that latitude must fall between
	this.addRange = (w, e) => {
		this.removeRange()

		this.addRule(new Rule(`>= _boundary W ${w}`, (input) => parseFloat(input) >= w, `Longitude is less than the W boundary of the selected model.`))
		this.addRule(new Rule(`<= _boundary E ${e}`, (input) => parseFloat(input) <= e, `Longitude is greater than the E boundary of the selected model.`))
	}

	this.removeRange = () => {
		this._rules = this.rules.filter(rule => !rule.name.includes("_boundary"))
	}

	// extends SmartValidator
	SmartValidator.call(this, [required, WEOnly, min, max], latLngPreProcessor)
}