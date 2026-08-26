import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const hobbies = sqliteTable('hobbies', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	color: text('color').notNull().default('#2563eb'),
	createdAt: text('created_at').notNull()
});

export const activities = sqliteTable('activities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	hobbyId: integer('hobby_id')
		.notNull()
		.references(() => hobbies.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	notes: text('notes'),
	occurredOn: text('occurred_on').notNull(),
	createdAt: text('created_at').notNull()
});

export const milestones = sqliteTable('milestones', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	hobbyId: integer('hobby_id')
		.notNull()
		.references(() => hobbies.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	imageUrl: text('image_url'),
	description: text('description').notNull(),
	achievedOn: text('achieved_on').notNull(),
	createdAt: text('created_at').notNull()
});

export const milestoneImages = sqliteTable('milestone_images', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	milestoneId: integer('milestone_id')
		.notNull()
		.references(() => milestones.id, { onDelete: 'cascade' }),
	imageUrl: text('image_url').notNull(),
	createdAt: text('created_at').notNull()
});
