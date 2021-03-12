let app = new Vue({

	// used to reference properties in front-end
	delimiters: ['[[', ']]'],

	// references div containing vue instance.
	el: '#app',

	// properties in data object used for reactivity.
	data() {
		return {
			inputLatN: new LatValidator(),
			inputLngW: new LonValidator(),
		}
	},

	// properties in data object can include logic to define value.
	// note: these are cached based on their reactive dependencies.
	computed: {

	},

	// watchers are fired when the associated property value is changed.
	watch: {

	},

	// methods in the methed object to be used for common functionanlity.
	methods: {

	},

	// code in the mounted() method will fire when the Vue instance is mounted. see:
	//     https://vuejs.org/v2/guide/instance.html#Lifecycle-Diagram
	mounted() {
		for(let i of this.inputLngW._rules) {
			console.log(i.errorMessage)
		}
	},
})
