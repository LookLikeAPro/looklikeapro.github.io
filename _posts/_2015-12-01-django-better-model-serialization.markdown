---
layout: post
title:  "Django Better Model Serialization"
date:   2015-12-01 22:11:40 -0500
categories: posts
---
The Django model serializer is absolutely brutal. Look at the code below:

	data = serializers.serialize("json", SomeModel.objects.all())

This code serializes an array of models into a string... What? What kind of service would ever return an array of raw models? Who does this??? **This string type serializer does not give any control over the return data.** Want to nest some information in each model? Tough luck, you can't. Want to remove the "ID" encapsulating each model, nope, let's give a bunch of meaningless IDs to the end user.

The serializer is also hilarious because it only works on a list of models. If you want a single model serialized, have fun with [hacky solutions](http://stackoverflow.com/questions/757022/how-do-you-serialize-a-model-instance-in-django)!

Ideally, we emulate the elegant behaviour of Rails models, where returning a model magically turns into a json response.

I have tried two solutions personally.

### 1. Convert Model to Dictionary

The first step is to define a model to dictionary helper function. Dictionaries are much more friendly than model to work with when generating a response.

	from django.db.models.fields.related import ManyToManyRel, ManyToManyField, ManyToOneRel
	from app.helpers.text import to_camel_case

	def _to_dict(self, *args, **kwargs):
		data = {}
		for field in self._meta.get_fields():
			if field.name in exclude_fields:
				continue
			if isinstance(field, ManyToOneRel):
				pass
			elif isinstance(field, ManyToManyField):
				pass
			elif isinstance(field, ManyToManyRel):
				pass
			else:
				data[field.name] = field.value_from_object(self)
		return data

It is meant to be called with a model as the `self` context. Using the Django `meta` API, a model can obtain fields belonging to it. (Read the docs on this, meta was a private API until 1.8 and this may change)

Including this method on each model needs to be done manually.

	from .modelMethods import _to_dict

	class Transaction(models.Model):
		amount = models.IntegerField()
		date = models.DateTimeField(auto_now_add=True)
		to_dict = _to_dict

`to_dict = _to_dict` is basically all there it to it. 

Now, working with models is way more sane than before.

	//Query a transaction
	transaction = Transaction.objects.get(id=0)
	transactionitems = transaction.transactionitem_set.all()
	transaction = transaction.to_dict()
	//Now transaction is a dictionary, transform this to the wanted response
	//Example: appending some other models
	transaction['items'] = []
	[transaction['items'].append(item.to_dict(exclude=('transaction', 'id'))) for item in transactionitems]
	//return using JsonResponse
	return JsonResponse(transaction)

### 2. Middleware

Not complete yet. The idea is to create a middleware which intercepts responses. Whenver a model or array of models is seen, automatically call `to_dict` on each one.