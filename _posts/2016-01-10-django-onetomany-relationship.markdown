---
layout: post
title:  "Django OneToMany Relationship Clarification"
date:   2016-01-1 22:11:40 -0500
categories: jekyll update
---
Newcomers to Django might notice something strange about Django model relations. There is `model.ForeignKey` which represents many-to-one relationship, `model.ManyToManyField` which is the many-to-many relationship, but there is no one-to-many relationship!

Some argue that one-to-many relationship is redudant with many-to-one, and since it is not represented by an actual field in a relational database, it should not be implemented.

A quick google search even turns up full pages of results saying one-to-many is not possible.

[http://stackoverflow.com/questions/6928692/how-to-express-a-one-to-many-relationship-in-django](http://stackoverflow.com/questions/6928692/how-to-express-a-one-to-many-relationship-in-django)
[http://blog.amir.rachum.com/blog/2013/06/15/a-case-for-a-onetomany-relationship-in-django/](http://blog.amir.rachum.com/blog/2013/06/15/a-case-for-a-onetomany-relationship-in-django/)
[https://www.quora.com/What-is-the-best-way-to-implement-one-to-many-image-field-in-Django](https://www.quora.com/What-is-the-best-way-to-implement-one-to-many-image-field-in-Django)
[http://james.lin.net.nz/2014/09/17/django-should-have-onetomanyfield/](http://james.lin.net.nz/2014/09/17/django-should-have-onetomanyfield/)

However, **one-to-many is avaliable in Django ORM, as a query, not a model field**.

	class Transaction(models.Model):
		amount = models.IntegerField()
		date = models.DateTimeField(auto_now_add=True)

	class TransactionItem(models.Model):
		transaction = models.ForeignKey('Transaction')
		amount = models.IntegerField()
		count = models.IntegerField()

Take for example, models Transaction and TransactionItem. It should be obvious that TransactionItem "belongs to" Transaction. It is possible to query for all TransactionItems belonging to one Transaction with:

	transaction.transactionitem_set.all()

The query is the lowercase of the many-to-one model, followed by `_set`.

However, having to remember to make this extra query, while other frameworks such as Rails just use the one-to-many relationship is not ideal. Using a `@property` makes this a bit more conveinient.

	class Transaction(models.Model):
		amount = models.IntegerField()
		date = models.DateTimeField(auto_now_add=True)
		@property
		def items(self):
			return self.transactionitems_set.all()

This makes querying TransactionItems as simple as calling `transaction.items`

Similarly, it may be conveinent to set up a setter with `@items.setter def(self, value)` as well.
