-- English A uses the three assessment profiles defined by the revised syllabus.
-- Existing Mathematics enum values remain unchanged.
alter type assessment_profile add value if not exists 'understanding';
alter type assessment_profile add value if not exists 'analysing';
alter type assessment_profile add value if not exists 'evaluating_creating';
alter type response_type add value if not exists 'long_text';
