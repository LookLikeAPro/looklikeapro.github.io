---
layout: post
title:  "Choosing a ReactJS Data Layer"
date:   2015-11-01 22:11:40 -0500
categories: posts
---
ReactJS components is powerful and quick for the front end, but unlike competing frameworks such as Ember, Angular and Backbone, React is not a complete solution. React components are Views in the traditional sense of Model-View-Controller, but it is up to the developers to implement the data layer for their apps.

Facebook recommends the flux pattern, condemning the MVC pattern for the exponential growth in complexity for larger apps. The most enticing part of flux for me is that the data layer is completely synchronous. With the exception of the API module, all the services / stores have completely predictable behaviours. No callbacks and promises to deal with! If this does not excite you, I don't know what you are looking for.

## [Flux pattern](https://facebook.github.io/flux/docs/overview.html)

Flux pattern introduces stores and actions to manage data for react components. This is according to React's one-way data flow philosophy. Data can only flow in one direction from `store -> component tree`. For react presentation layer to affect change to store, it will dispatch an action. Stores can listen to actions and make changes accordingly.

![flux](/assets/flux/flux-simple-diagram.png)
###### Image by Facebook

This data flow can be applied to the API layer as well. The API listens for requests from components, makes the API call, and dispatches a "payload" action when the data is received. Stores would listen to the payload and make changes to their state.

![flux-with-api](/assets/flux/flux-diagram.png)
###### Image by Facebook

In my experience, Facebook's flux implementation is good at its job. The one way data flow makes it easy to track state changes within the app, and hard to write bad code and anti-pattern. 

However, the implementation has the following downsides:

1. Flux is unable to dispatch an action while any other action is in execution. For example, if two stores need to change based on one action, they either (1.) each listen to the action and run the similar logic, violating DRY, or (2.) one store will call a function from another, easy to cause circular dependency.

	It also causes a minor annoyance: when components invoke an action and update the store, the store cannot inform the components of the change via flux dispatcher. Node's [EventEmitter](http://nodejs.org/api/events.html) with browser polyfill is used instead.

	As a result, every store needs to include this useless piece of code:

		var testStore = Object.assign(EventEmitter.prototype, {
			...
			emitChange() {
				this.emit("change");
			},
			addChangeListener(callback) {
				this.on("change", callback);
			},
			removeChangeListener(callback) {
				this.removeListener("change", callback);
			}
		});

	And every "smart" component needs to include this:

		class Page extends React.Component {
			getState() {
				return {...};
			}
			state = this.getState();
			componentDidMount() {
				testStore.addChangeListener(this._onChange);
			}
			componentWillUnmount() {
				testStore.removeChangeListener(this._onChange);
			}
			...
		}


2. Flux does not help the developer deal with asynchronous tasks. Implementing the asynchronous API layer introduced a lot of redundancy into my application. This is because both stores and API ned to know the API keys to communicate with each other. Notice the insane dependency to constants in my app.
![flux](/assets/flux/flux-app-dependency-diagram.png)

## [Items-store pattern](http://github.com/webpack/items-store)

Webpack has a neat project by the name of items-store, which they call "A simple flux-like architecture with a syncing items store". It has not received much attention (45 start on Github) compared to other solutions, but I think it is versatile enough to find its place in any application. This architecture basically calls for removing the emphasis from grouping data into stores, instead encapsulating each piece of data in a item-store object.

![items-store-pattern](/assets/flux/items-store-diagram.png)
###### Image by Webpack

Often when using the flux architecture, I find that each piece of data needs the following functions:

- `get`, a function to offer synchronous access to a piece of data, used by component
- `set`, a function to set or mutate the piece of data
- `request`, a function to message API module to request the data from server or other asynchronous source
- `outdate`, a function to mark the stored data as outdated, so the next get call will call `request`
- `isLoading`, a function to synchronously return whether the piece of data is currently loading

Items-store basically helps create an object, encapsulating the data and offering these functions plus more. Items-store also plays nice with React, it can be set up so that data change will cause re-render of components. Webpack's [react-starter](https://github.com/webpack/react-starter) is an elegant starter project that uses this pattern.

However, the pattern has an obvious weakness. Each piece of data, regardless of if it is a pagination of entries, or just the current user's name, are all encapsulated and rather isolated from one another. App logic is unintuitive as it tries to manage the relation between different itemstores.

## Flux-like patterns

### [Fluxxor](http://github.com/BinaryMuse/fluxxor)

Fluxxor looks like a reasonable implementation of flux that simplifies some ugly parts of original flux. There is no need to register components with stores using EventEmitter - there is a mixin to handle it. There is no need to make a dispatcher - the stores automatically listen to actions.

However, mixins are being deprecated as React moves towards ES6 syntax. I don't know how Fluxxor plans to deal with this change moving forward. Which begs the question - how wise is it to use React without ES6/7 syntax?

Disclaimer: I never used Fluxxor - this is only my first impression.

### [Reflux](http://github.com/reflux/refluxjs)

Reflux is a implementation of flux that, similar to Fluxxor, simplifies and abstracts away the action dispatcher. Creating actions with Reflux is no longer a function, instead each action is an object. This is more restrictive but allows for callbacks upon finished an async action - greatly helping reduce the redundancy of API.

Example:

	var Actions = Reflux.createActions({
		"load": {children: ["completed","failed"]}
	});
	Actions.load.listen( function() {
		someAsyncOperation()
			.then( this.completed )
			.catch( this.failed );
	});

### [Redux](http://github.com/rackt/redux)

Unlike the previous two, Redux is closer to a complete rework of flux. Here are the key differences:

1. Stores are replaced by a single store, which is created by passing in reducer and initial data. Reducer is a collection of functions that handle actions.
2. All data across the entire app is kept in one data object inside the store. It is the global state in one place.
3. When an action happens, a function is first called to scope part of the global state (this is optional good practice). The scoped part is passed to the reducer, which mutates the global state and causes component re-render.
4. Actions are functions that can involve any number of steps, dealing with async tasks easily.
5. React components no longer grab data from store to update their own state. [React-redux](http://github.com/rackt/react-redux) injects the global state as props to components. The components are thus prevented from mutating data in unexpected ways.

This pattern is groundbreaking and yet completely reasonable. I am in the process of migrating my app from Facebook flux to Redux.

## Other Patterns

Does flux make you hate life? Maybe it is time to rethink...  [This guide](http://github.com/planningcenter/flux-patterns) offers some good suggestions about when to use and not use flux. Going over the checklist may save days of dev time if your project is not large or quality obsessed. 

A popular strategy is throwing everything into the root component. Using contexts, an experimental react feature not yet documented, all children to the root component can have access to exposed properties in the root component. It is like passing props, but done automatically throughout the app. The pages can then grab the functions and data it needs easily.

![hut.jpg](/assets/flux/central-ethiopia-hut.jpg)

Putting aside the good structure and common sense of Flux, development can be fun and hectic for everyone.

For instance MVC is not so bad right? Instead of writing stores and worrying about updating components from them, just think of react pages in the sense of traditional MVC? Hmm??? Each page is a view, so throw all logic needed by the view into the component itself, AKA View + Controller. Throw in some API & storage singletons, etc. to handle backend data, AKA Model. Seems legit.

However, using stores and components without actions is 100% a bad idea. It is considered an anti-pattern for it introduces high coupling between stores and components.

<style>
	h6 {
		margin-top: -10px;
		text-align:right;
	}
</style>
