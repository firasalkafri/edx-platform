(function(define) {
    'use strict';

    define(
        [
            'jquery',
            'backbone',
            'discussion/js/discussion_router',
            'common/js/discussion/discussion',
            'common/js/discussion/models/discussion_course_settings',
            'common/js/discussion/views/new_post_view',
            'discussion/js/views/discussion_board_view'
        ],
        function($, Backbone, DiscussionRouter, Discussion, DiscussionCourseSettings, NewPostView,
                 DiscussionBoardView) {
            return function(options) {
                var userInfo = options.user_info,
                    sortPreference = options.sort_preference,
                    threads = options.threads,
                    threadPages = options.thread_pages,
                    contentInfo = options.content_info,
                    user = new window.DiscussionUser(userInfo),
                    discussion,
                    courseSettings,
                    newPostView,
                    discussionBoardView,
                    router,
                    routerEvents;

                // TODO: Perhaps eliminate usage of global variables when possible
                window.DiscussionUtil.loadRoles(options.roles);
                window.$$course_id = options.courseId;
                window.courseName = options.course_name;
                window.DiscussionUtil.setUser(user);
                window.user = user;
                window.Content.loadContentInfos(contentInfo);

                // Create a discussion model
                discussion = new Discussion(threads, {pages: threadPages, sort: sortPreference});
                courseSettings = new DiscussionCourseSettings(options.course_settings);

                // Create the discussion board view
                discussionBoardView = new DiscussionBoardView({
                    el: $('.discussion-board'),
                    discussion: discussion,
                    courseSettings: courseSettings
                });

                // Create the new post view
                newPostView = new NewPostView({
                    el: $('.new-post-article'),
                    collection: discussion,
                    course_settings: courseSettings,
                    mode: 'tab'
                });
                newPostView.render();

                // Set up a router to manage the page's history
                router = new DiscussionRouter({
                    courseId: options.courseId,
                    discussion: discussion,
                    courseSettings: courseSettings,
                    discussionBoardView: discussionBoardView,
                    newPostView: newPostView
                });
                router.start();
                routerEvents = {
                    // Add new breadcrumbs and clear search box when the user selects topics
                    'topic:selected': function(topic) {
                        router.discussionBoardView.breadcrumbs.model.set('contents', topic);
                    },
                    // Clear search box when a thread is selected
                    'thread:selected': function() {
                        router.discussionBoardView.searchBox.clearSearch();
                    }
                };
                Object.keys(routerEvents).forEach(function(key) {
                    router.discussionBoardView.on(key, routerEvents[key]);
                });
            };
        });
}).call(this, define || RequireJS.define);
