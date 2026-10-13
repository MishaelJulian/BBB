-- Generated from app/database/models.py + identity_models.py (SQLAlchemy, postgresql dialect) on 2026-10-13.
-- Edits: boolean defaults fixed; redundant ix_*_id indexes dropped (the primary key already indexes id).
begin;
CREATE TABLE aliases (
	entity_type VARCHAR(64) NOT NULL, 
	entity_id VARCHAR(36) NOT NULL, 
	alias_name VARCHAR(256) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_aliases_alias_name ON aliases (alias_name);

CREATE INDEX ix_aliases_entity_id ON aliases (entity_id);

CREATE INDEX ix_aliases_entity_type ON aliases (entity_type);


CREATE INDEX ix_aliases_type_name ON aliases (entity_type, alias_name);

CREATE TABLE authors (
	full_name VARCHAR(256) NOT NULL, 
	normalized_name VARCHAR(256) NOT NULL, 
	country VARCHAR(128), 
	description TEXT, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_authors_full_name ON authors (full_name);


CREATE UNIQUE INDEX ix_authors_normalized_name ON authors (normalized_name);

CREATE TABLE genres (
	name VARCHAR(128) NOT NULL, 
	slug VARCHAR(128) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (slug)
);


CREATE UNIQUE INDEX ix_genres_name ON genres (name);

CREATE TABLE identifier_schemes (
	scheme VARCHAR(32) NOT NULL, 
	level VARCHAR(8) NOT NULL, 
	kind VARCHAR(16) NOT NULL, 
	authority_rank INTEGER NOT NULL, 
	PRIMARY KEY (scheme), 
	CONSTRAINT ck_scheme_level CHECK (level IN ('work', 'edition')), 
	CONSTRAINT ck_scheme_kind CHECK (kind IN ('standard', 'open', 'commercial', 'manual')), 
	CONSTRAINT uq_scheme_level UNIQUE (scheme, level), 
	CONSTRAINT uq_scheme_rank_per_level UNIQUE (level, authority_rank)
);

CREATE TABLE import_jobs (
	source_type VARCHAR(64) NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	total_items INTEGER NOT NULL, 
	processed_items INTEGER NOT NULL, 
	error_count INTEGER NOT NULL, 
	started_at VARCHAR(64), 
	completed_at VARCHAR(64), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);


CREATE INDEX ix_import_jobs_status ON import_jobs (status);

CREATE TABLE media_categories (
	code VARCHAR(32) NOT NULL, 
	label VARCHAR(64) NOT NULL, 
	sort_order INTEGER NOT NULL, 
	PRIMARY KEY (code)
);

CREATE TABLE members (
	display_name VARCHAR(256) NOT NULL, 
	normalized_name VARCHAR(256) NOT NULL, 
	bio TEXT, 
	is_hidden BOOLEAN DEFAULT false NOT NULL, 
	status VARCHAR(16) DEFAULT 'member' NOT NULL, 
	member_code VARCHAR(16), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_members_display_name ON members (display_name);


CREATE UNIQUE INDEX ix_members_normalized_name ON members (normalized_name);

CREATE TABLE publishers (
	name VARCHAR(256) NOT NULL, 
	location VARCHAR(256), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);


CREATE UNIQUE INDEX ix_publishers_name ON publishers (name);

CREATE TABLE removed_members_archive (
	id VARCHAR(36) NOT NULL, 
	display_name VARCHAR(256) NOT NULL, 
	normalized_name VARCHAR(256) NOT NULL, 
	bio TEXT, 
	discussions_snapshot TEXT, 
	removed_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE sources (
	file_path VARCHAR(1024) NOT NULL, 
	source_type VARCHAR(64) NOT NULL, 
	meetup_number INTEGER, 
	pdf_page INTEGER, 
	paragraph_index INTEGER, 
	start_line INTEGER, 
	end_line INTEGER, 
	extraction_confidence FLOAT NOT NULL, 
	raw_text TEXT NOT NULL, 
	importer_name VARCHAR(128) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_sources_file_meetup ON sources (file_path, meetup_number);

CREATE INDEX ix_sources_file_path ON sources (file_path);


CREATE INDEX ix_sources_meetup_number ON sources (meetup_number);

CREATE INDEX ix_sources_source_type ON sources (source_type);

CREATE TABLE tags (
	name VARCHAR(128) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);


CREATE UNIQUE INDEX ix_tags_name ON tags (name);

CREATE TABLE venues (
	name VARCHAR(256) NOT NULL, 
	city VARCHAR(128) NOT NULL, 
	address VARCHAR(512), 
	is_online BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_venues_city ON venues (city);


CREATE INDEX ix_venues_is_online ON venues (is_online);

CREATE UNIQUE INDEX ix_venues_name ON venues (name);

CREATE TABLE import_logs (
	job_id VARCHAR(36), 
	log_level VARCHAR(16) NOT NULL, 
	message TEXT NOT NULL, 
	timestamp VARCHAR(64) NOT NULL, 
	details TEXT, 
	id VARCHAR(36) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(job_id) REFERENCES import_jobs (id)
);


CREATE INDEX ix_import_logs_job_id ON import_logs (job_id);

CREATE TABLE meetups (
	meetup_number INTEGER NOT NULL, 
	date DATE, 
	title VARCHAR(256), 
	venue_id VARCHAR(36), 
	format VARCHAR(32) NOT NULL, 
	attendance_count INTEGER, 
	description TEXT, 
	source_id VARCHAR(36), 
	photo_url VARCHAR(512), 
	pdf_url VARCHAR(512), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(venue_id) REFERENCES venues (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id)
);

CREATE INDEX ix_meetups_date ON meetups (date);


CREATE UNIQUE INDEX ix_meetups_meetup_number ON meetups (meetup_number);

CREATE INDEX ix_meetups_source_id ON meetups (source_id);

CREATE INDEX ix_meetups_venue_id ON meetups (venue_id);

CREATE TABLE series (
	title VARCHAR(256) NOT NULL, 
	normalized_title VARCHAR(256), 
	author_id VARCHAR(36), 
	description TEXT, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(author_id) REFERENCES authors (id)
);

CREATE INDEX ix_series_author_id ON series (author_id);


CREATE UNIQUE INDEX ix_series_title ON series (title);

CREATE TABLE validation_errors (
	job_id VARCHAR(36), 
	record_type VARCHAR(64) NOT NULL, 
	record_id VARCHAR(36), 
	field_name VARCHAR(128), 
	error_message TEXT NOT NULL, 
	severity VARCHAR(16) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(job_id) REFERENCES import_jobs (id)
);


CREATE INDEX ix_validation_errors_job_id ON validation_errors (job_id);

CREATE TABLE canonical_books (
	title VARCHAR(512) NOT NULL, 
	normalized_title VARCHAR(512) NOT NULL, 
	subtitle VARCHAR(512), 
	sort_title VARCHAR(512), 
	author_id VARCHAR(36), 
	publisher_id VARCHAR(36), 
	series_id VARCHAR(36), 
	series_position FLOAT, 
	isbn10 VARCHAR(10), 
	isbn13 VARCHAR(13), 
	asin VARCHAR(20), 
	language VARCHAR(16) NOT NULL, 
	publication_year INTEGER, 
	page_count INTEGER, 
	cover_url VARCHAR(1024), 
	thumbnail_url VARCHAR(1024), 
	description TEXT, 
	goodreads_id VARCHAR(64), 
	openlibrary_id VARCHAR(64), 
	google_books_id VARCHAR(64), 
	rating FLOAT, 
	media_type VARCHAR(32) NOT NULL, 
	external_url VARCHAR(1024), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(author_id) REFERENCES authors (id), 
	FOREIGN KEY(publisher_id) REFERENCES publishers (id), 
	FOREIGN KEY(series_id) REFERENCES series (id)
);

CREATE INDEX ix_canonical_books_author_id ON canonical_books (author_id);

CREATE INDEX ix_canonical_books_goodreads_id ON canonical_books (goodreads_id);


CREATE INDEX ix_canonical_books_isbn10 ON canonical_books (isbn10);

CREATE INDEX ix_canonical_books_isbn13 ON canonical_books (isbn13);

CREATE INDEX ix_canonical_books_norm_author ON canonical_books (normalized_title, author_id);

CREATE INDEX ix_canonical_books_normalized_title ON canonical_books (normalized_title);

CREATE INDEX ix_canonical_books_title ON canonical_books (title);

CREATE TABLE meetup_attendance (
	meetup_id VARCHAR(36) NOT NULL, 
	member_id VARCHAR(36) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	source VARCHAR(16) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(meetup_id) REFERENCES meetups (id) ON DELETE CASCADE, 
	FOREIGN KEY(member_id) REFERENCES members (id) ON DELETE CASCADE
);


CREATE INDEX ix_meetup_attendance_member_id ON meetup_attendance (member_id);

CREATE TABLE resources (
	meetup_id VARCHAR(36) NOT NULL, 
	url VARCHAR(2048) NOT NULL, 
	title VARCHAR(256), 
	resource_type VARCHAR(64) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(meetup_id) REFERENCES meetups (id)
);


CREATE INDEX ix_resources_meetup_id ON resources (meetup_id);

CREATE TABLE book_relations (
	source_book_id VARCHAR(36) NOT NULL, 
	target_book_id VARCHAR(36) NOT NULL, 
	relation_type VARCHAR(64) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_book_id) REFERENCES canonical_books (id), 
	FOREIGN KEY(target_book_id) REFERENCES canonical_books (id)
);


CREATE INDEX ix_book_relations_source_book_id ON book_relations (source_book_id);

CREATE INDEX ix_book_relations_target_book_id ON book_relations (target_book_id);

CREATE TABLE current_reads (
	meetup_id VARCHAR(36) NOT NULL, 
	canonical_book_id VARCHAR(36) NOT NULL, 
	member_id VARCHAR(36), 
	status VARCHAR(32) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(meetup_id) REFERENCES meetups (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id), 
	FOREIGN KEY(member_id) REFERENCES members (id)
);

CREATE INDEX ix_current_reads_canonical_book_id ON current_reads (canonical_book_id);


CREATE INDEX ix_current_reads_meetup_id ON current_reads (meetup_id);

CREATE INDEX ix_current_reads_member_id ON current_reads (member_id);

CREATE TABLE discussions (
	meetup_id VARCHAR(36) NOT NULL, 
	canonical_book_id VARCHAR(36), 
	member_id VARCHAR(36), 
	topic VARCHAR(256), 
	notes TEXT, 
	rating FLOAT, 
	sentiment VARCHAR(64), 
	confidence_score FLOAT NOT NULL, 
	media_type VARCHAR(32) NOT NULL, 
	external_url VARCHAR(1024), 
	is_tangent BOOLEAN DEFAULT false NOT NULL, 
	series_id VARCHAR(36), 
	source_id VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(meetup_id) REFERENCES meetups (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id), 
	FOREIGN KEY(member_id) REFERENCES members (id), 
	FOREIGN KEY(series_id) REFERENCES series (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id)
);

CREATE INDEX ix_discussions_canonical_book_id ON discussions (canonical_book_id);


CREATE INDEX ix_discussions_meetup_id ON discussions (meetup_id);

CREATE INDEX ix_discussions_member_id ON discussions (member_id);

CREATE INDEX ix_discussions_series_id ON discussions (series_id);

CREATE INDEX ix_discussions_source_id ON discussions (source_id);

CREATE TABLE editions (
	work_id VARCHAR(36) NOT NULL, 
	publisher_id VARCHAR(36), 
	publication_year INTEGER, 
	identity_basis VARCHAR(32) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT fk_edition_basis FOREIGN KEY(identity_basis) REFERENCES identifier_schemes (scheme), 
	CONSTRAINT ck_edition_year CHECK (publication_year IS NULL OR publication_year <= 2100), 
	CONSTRAINT ck_edition_manual_needs_publisher_and_year CHECK (identity_basis <> 'manual' OR (publisher_id IS NOT NULL AND publication_year IS NOT NULL)), 
	FOREIGN KEY(work_id) REFERENCES canonical_books (id) ON DELETE RESTRICT, 
	FOREIGN KEY(publisher_id) REFERENCES publishers (id) ON DELETE RESTRICT
);


CREATE INDEX ix_editions_work_id ON editions (work_id);

CREATE UNIQUE INDEX uq_editions_manual ON editions (work_id, publisher_id, publication_year) WHERE identity_basis = 'manual';

CREATE TABLE imported_books (
	raw_title VARCHAR(512) NOT NULL, 
	raw_author VARCHAR(256), 
	normalized_title VARCHAR(512) NOT NULL, 
	source_id VARCHAR(36) NOT NULL, 
	canonical_book_id VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id)
);

CREATE INDEX ix_imported_books_canonical_book_id ON imported_books (canonical_book_id);


CREATE INDEX ix_imported_books_normalized_title ON imported_books (normalized_title);

CREATE INDEX ix_imported_books_raw_author ON imported_books (raw_author);

CREATE INDEX ix_imported_books_raw_title ON imported_books (raw_title);

CREATE INDEX ix_imported_books_source_id ON imported_books (source_id);

CREATE TABLE recommendations (
	meetup_id VARCHAR(36) NOT NULL, 
	canonical_book_id VARCHAR(36) NOT NULL, 
	recommender_id VARCHAR(36), 
	context TEXT, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(meetup_id) REFERENCES meetups (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id), 
	FOREIGN KEY(recommender_id) REFERENCES members (id)
);

CREATE INDEX ix_recommendations_canonical_book_id ON recommendations (canonical_book_id);


CREATE INDEX ix_recommendations_meetup_id ON recommendations (meetup_id);

CREATE INDEX ix_recommendations_recommender_id ON recommendations (recommender_id);

CREATE TABLE work_identifiers (
	scheme VARCHAR(32) NOT NULL, 
	value VARCHAR(64) NOT NULL, 
	level VARCHAR(8) DEFAULT 'work' NOT NULL, 
	work_id VARCHAR(36) NOT NULL, 
	PRIMARY KEY (scheme, value), 
	FOREIGN KEY(scheme, level) REFERENCES identifier_schemes (scheme, level), 
	CONSTRAINT ck_work_identifier_level CHECK (level = 'work'), 
	FOREIGN KEY(work_id) REFERENCES canonical_books (id) ON DELETE CASCADE
);

CREATE INDEX ix_work_identifiers_work_id ON work_identifiers (work_id);

CREATE TABLE book_mentions (
	discussion_id VARCHAR(36) NOT NULL, 
	canonical_book_id VARCHAR(36) NOT NULL, 
	context_snippet TEXT, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(discussion_id) REFERENCES discussions (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id)
);

CREATE INDEX ix_book_mentions_canonical_book_id ON book_mentions (canonical_book_id);

CREATE INDEX ix_book_mentions_discussion_id ON book_mentions (discussion_id);


CREATE TABLE discussion_participants (
	discussion_id VARCHAR(36) NOT NULL, 
	member_id VARCHAR(36) NOT NULL, 
	role VARCHAR(64), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(discussion_id) REFERENCES discussions (id), 
	FOREIGN KEY(member_id) REFERENCES members (id)
);

CREATE INDEX ix_discussion_participants_discussion_id ON discussion_participants (discussion_id);


CREATE INDEX ix_discussion_participants_member_id ON discussion_participants (member_id);

CREATE TABLE edition_identifiers (
	scheme VARCHAR(32) NOT NULL, 
	value VARCHAR(64) NOT NULL, 
	level VARCHAR(8) DEFAULT 'edition' NOT NULL, 
	edition_id VARCHAR(36) NOT NULL, 
	PRIMARY KEY (scheme, value), 
	FOREIGN KEY(scheme, level) REFERENCES identifier_schemes (scheme, level), 
	CONSTRAINT ck_edition_identifier_level CHECK (level = 'edition'), 
	CONSTRAINT ck_isbn13_digits CHECK (scheme <> 'isbn13' OR (length(value) = 13 AND value ~ '^[0-9]+$')), 
	FOREIGN KEY(edition_id) REFERENCES editions (id) ON DELETE CASCADE
);

CREATE INDEX ix_edition_identifiers_edition_id ON edition_identifiers (edition_id);

CREATE TABLE possible_duplicates (
	imported_book_id VARCHAR(36) NOT NULL, 
	candidate_canonical_id VARCHAR(36) NOT NULL, 
	match_confidence FLOAT NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(imported_book_id) REFERENCES imported_books (id), 
	FOREIGN KEY(candidate_canonical_id) REFERENCES canonical_books (id)
);

CREATE INDEX ix_possible_duplicates_candidate_canonical_id ON possible_duplicates (candidate_canonical_id);


CREATE INDEX ix_possible_duplicates_imported_book_id ON possible_duplicates (imported_book_id);

CREATE INDEX ix_possible_duplicates_status ON possible_duplicates (status);

CREATE TABLE quotes (
	discussion_id VARCHAR(36), 
	canonical_book_id VARCHAR(36), 
	member_id VARCHAR(36), 
	quote_text TEXT NOT NULL, 
	page_number INTEGER, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(discussion_id) REFERENCES discussions (id), 
	FOREIGN KEY(canonical_book_id) REFERENCES canonical_books (id), 
	FOREIGN KEY(member_id) REFERENCES members (id)
);

CREATE INDEX ix_quotes_canonical_book_id ON quotes (canonical_book_id);

CREATE INDEX ix_quotes_discussion_id ON quotes (discussion_id);

commit;
