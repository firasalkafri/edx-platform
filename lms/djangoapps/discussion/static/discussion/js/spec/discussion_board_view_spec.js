/* globals Discussion, DiscussionCourseSettings */
define(
    [
        'underscore',
        'jquery',
        'edx-ui-toolkit/js/utils/constants',
        'discussion/js/views/discussion_board_view',
        'discussion/js/views/discussion_search_view',
        'common/js/discussion/models/discussion_course_settings'
    ],
    function(_, $, constants, DiscussionBoardView, DiscussionSearchView, DiscussionCourseSettings) {
        'use strict';
        describe('DiscussionBoardView', function() {
            var discussionBoardView,
                courseSettings = new DiscussionCourseSettings();
                discussion = new Discussion([], {
                    pages: 1
                });
            beforeEach(function() {
                discussionBoardView = new DiscussionBoardView({
                    el: $('.discussion-board'),
                    discussion: discussion,
                    courseSettings: courseSettings
                });
                return spyOn(DiscussionBoardView.prototype, 'render');
            });

            describe('DiscussionSearchView', function() {
                var searchView;
                beforeEach(function() {
                    setFixtures('<div class="search-container"></div>');
                    searchView = new DiscussionSearchView({
                        el: $('.search-container'),
                        discussionThreadListView: {
                            performSearch: jasmine.createSpy()
                        }
                    }).render();
                });

                describe('Search events', function() {
                    it('perform search when enter pressed inside search textfield', function() {
                        discussionBoardView.$el.find('.search-input').trigger($.Event('keydown', {
                            which: constants.keyCodes.enter
                        }));
                        expect(discussionBoardView.discussionThreadListView.performSearch).toHaveBeenCalled();
                    });

                    it('perform search when search icon is clicked', function() {
                        discussionBoardView.$el.find('.search-btn').click();
                        expect(discussionBoardView.discussionThreadListView.performSearch).toHaveBeenCalled();
                    });
                });

            });
        });
    }
);
