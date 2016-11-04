/* globals Discussion, DiscussionCourseSettings */
(function(define) {
    'use strict';
    define([
        'underscore',
        'jquery',
        'edx-ui-toolkit/js/utils/constants',
        'common/js/discussion/discussion',
        'discussion/js/views/discussion_board_view',
        'discussion/js/views/discussion_search_view',
        'common/js/discussion/models/discussion_course_settings'
    ],
    function(_, $, constants, Discussion, DiscussionBoardView, DiscussionSearchView, DiscussionCourseSettings) {
        'use strict';
        describe('DiscussionBoardView', function() {
            var discussionBoardView, searchView,
                courseSettings = new DiscussionCourseSettings(),
                discussion = new Discussion([], {
                    pages: 1
                });

            setFixtures('<div class="search-container"></div>');
            searchView = new DiscussionSearchView({
                el: $('.search-container'),
                discussionThreadListView: {
                    performSearch: jasmine.createSpy()
                }
            }).render();

            discussionBoardView = new DiscussionBoardView({
                el: $('#fixture-element'),
                discussion: discussion,
                courseSettings: courseSettings,
                searchBox: searchView
            });
            return spyOn(DiscussionBoardView.prototype, 'render');

            describe('Search events', function() {
                it('perform search when enter pressed inside search textfield', function() {
                    searchView.$el.find('.search-input').trigger($.Event('keydown', {
                        which: constants.keyCodes.enter
                    }));
                    expect(discussionBoardView.discussionThreadListView.performSearch).toHaveBeenCalled();
                });

                it('perform search when search icon is clicked', function() {
                    searchView.$el.find('.search-btn').click();
                    expect(discussionBoardView.discussionThreadListView.performSearch).toHaveBeenCalled();
                });
            });

        });
    });
}).call(this, define || RequireJS.define);
