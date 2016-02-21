---
layout: post
title:  "Django Model Lifecycle"
date:   2016-02-18 22:11:40 -0500
categories: posts
---
Django model lifecycle is too often misunderstood as a nonexistent feature.

Many Django developers end up writing massive managers for each model to attempt to hook into the lifecycle of models, when it should be a much simpler process. However in this case, I blame Django for poor documentation that assumes users are informed.

Django model lifecycle is available by default in the form of [signals](https://docs.djangoproject.com/en/1.9/topics/signals/).

Signals is essentially event dispatching within Django, and unlike lifecycle methods in active record, they are more versatile as signals can be listened to from anywhere inside the app.

All Django default signals are available [here](https://docs.djangoproject.com/en/1.9/ref/signals/). For the purpose of creating model lifecycle, the important signals are the following:

	django.db.models.signals.pre_init
	django.db.models.signals.post_init
	django.db.models.signals.pre_save
	django.db.models.signals.post_save
	django.db.models.signals.pre_delete
	django.db.models.signals.post_delete
	django.db.models.signals.m2m_changed (many to many field changed)

For example, a common use case is to create an Account model that extends the default Django auth user model. User and Account are one-to-one models, ideally account is created with user and deleted upon user deletion.

	from django.db import models
	from django.contrib.auth.models import User
	from django.dispatch import receiver
	from django.db.models.signals import post_save

	class Account(models.Model):
		user = models.OneToOneField(User)

	@receiver(post_save, sender=User)
	def create_account_for_user(sender, instance=None, created=False, **kwargs):
		if created:
			Account.objects.create(user=instance)

To achieve this, simply listen to post_init of User model and create an account. User deletion causes account to cascade so there is no need to do anything upon deletion.

Signals enables models to interact with each other easily, but if some logic only concerns one model, it is better to simply [override the init and save methods of the model itself](http://stackoverflow.com/questions/4269605/django-override-save-for-model).
