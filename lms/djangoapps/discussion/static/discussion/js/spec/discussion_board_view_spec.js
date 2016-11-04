/* globals Discussion, DiscussionCourseSettings */
(function(define) {
    'use strict';
    define(
        [
            'underscore',
            'jquery',
            'edx-ui-toolkit/js/utils/constants',
            'common/js/discussion/discussion',
            'common/js/spec_helpers/discussion_spec_helper',
            'discussion/js/views/discussion_board_view',
            'discussion/js/views/discussion_search_view'
        ],
        function(_, $, constants, Discussion, DiscussionSpecHelper, DiscussionBoardView) {
            describe('DiscussionBoardView', function() {
                var createDiscussionBoardView;

                createDiscussionBoardView = function() {
                    var discussionBoardView, searchView,
                        discussion = DiscussionSpecHelper.createTestDiscussion({}),
                        courseSettings = DiscussionSpecHelper.createTestCourseSettings();

                    setFixtures('<div class="search-container"></div>');
                    DiscussionSpecHelper.setUnderscoreFixtures();

                    discussionBoardView = new DiscussionBoardView({
                        el: $('#fixture-element'),
                        discussion: discussion,
                        courseSettings: courseSettings
                    });

                    return discussionBoardView;
                };

                describe('Search events', function() {
                    it('perform search when enter pressed inside search textfield', function() {
                        var discussionBoardView = createDiscussionBoardView(),
                            searchView,
                            threadListView;
                        discussionBoardView.render();
                        searchView = discussionBoardView.searchView;
                        threadListView = discussionBoardView.discussionThreadListView;
                        spyOn(threadListView, 'performSearch');
                        searchView.$el.find('.search-input').trigger($.Event('keydown', {
                            which: constants.keyCodes.enter
                        }));
                        expect(threadListView.performSearch).toHaveBeenCalled();
                    });

                    it('perform search when search icon is clicked', function() {
                        var discussionBoardView = createDiscussionBoardView(),
                            searchView,
                            threadListView;
                        discussionBoardView.render();
                        searchView = discussionBoardView.searchView;
                        threadListView = discussionBoardView.discussionThreadListView;
                        spyOn(threadListView, 'performSearch');
                        searchView.$el.find('.search-btn').click();
                        expect(threadListView.performSearch).toHaveBeenCalled();
                    });
                });
            });
        });
}).call(this, define || RequireJS.define);
