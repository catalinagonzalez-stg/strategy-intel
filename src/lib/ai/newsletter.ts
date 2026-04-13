UPDATE signals SET edition_id = NULL WHERE edition_id IS NOT NULL;
DELETE FROM newsletter_items;
DELETE FROM newsletter_editions;
