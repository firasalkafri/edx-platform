/* globals _, DiscussionUtil, setupAjax, Thread */
define(
    [
        'jquery',
        'backbone',
        'common/js/spec_helpers/page_helpers',
        'common/js/spec_helpers/discussion_spec_helper',
        'edx-ui-toolkit/js/utils/constants',
        'discussion/js/views/discussion_board_view',
        'discussion/js/views/discussion_search_view'
    ],
    function($, Backbone, PageHelpers, DiscussionSpecHelper, constants, DiscussionBoardView, DiscussionSearchView) {
        'use strict';

        describe('Discussion Board View', function() {
            var initializeDiscussionBoardView = function() { // eslint-disable-line no-unused-vars
                DiscussionBoardView({
                    el: $('.discussion-board'),
                    courseId: 'test_course_id',
                    course_name: 'Test Course',
                    user_info: DiscussionSpecHelper.getTestUserInfo(),
                    roles: DiscussionSpecHelper.getTestRoleInfo(),
                    sort_preference: null,
                    threads: [],
                    thread_pages: [],
                    content_info: null,
                    course_settings: {
                        is_cohorted: false,
                        allow_anonymous: false,
                        allow_anonymous_to_peers: false,
                        cohorts: [],
                        category_map: {}
                    }
                });
            };

            beforeEach(function() {
                PageHelpers.preventBackboneChangingUrl();

                // Install the fixtures
                setFixtures(
                    '<div class="discussion-body">' +
                    '    <div class="forum-nav"></div>' +
                    '</div>'
                );
                DiscussionSpecHelper.setUnderscoreFixtures();
            });

            afterEach(function() {
                Backbone.history.stop();
            });

            describe('browse menu', function() {
                var expectBrowseMenuVisible;

                expectBrowseMenuVisible = function(isVisible) {
                    expect($('.forum-nav-browse-menu:visible').length).toEqual(isVisible ? 1 : 0);
                    expect($('.forum-nav-thread-list-wrapper:visible').length).toEqual(isVisible ? 0 : 1);
                };

                it('should be visible by default', function() {
                    expectBrowseMenuVisible(true);
                });

                describe('when shown', function() {
                    it('should show again when header button is clicked', function() {
                        $('.forum-nav-browse').click();
                        expectBrowseMenuVisible(false);
                    });

                    it('should hide when a click outside the menu occurs', function() {
                        $('.forum-nav-search-input').click();
                        expectBrowseMenuVisible(false);
                    });

                    it('should hide when a category is clicked', function() {
                        $('.forum-nav-browse-title')[0].click();
                        expectBrowseMenuVisible(false);
                    });

                    it('should still be shown when filter input is clicked', function() {
                        $('.forum-nav-browse-filter-input').click();
                        expectBrowseMenuVisible(true);
                    });

                    describe('filtering', function() {
                        var checkFilter = function(filterText, expectedItems) {
                            var visibleItems = $('.forum-nav-browse-title:visible').map(function(i, elem) {
                                return $(elem).text();
                            }).get();
                            $('.forum-nav-browse-filter-input').val(filterText).keyup();
                            return expect(visibleItems).toEqual(expectedItems);
                        };

                        it('should be case-insensitive', function() {
                            return checkFilter('other', ['Other Category']);
                        });

                        it('should match partial words', function() {
                            return checkFilter('ateg', ['Other Category']);
                        });

                        it('should show ancestors and descendants of matches', function() {
                            return checkFilter('Target', ['Parent', 'Target', 'Child']);
                        });

                        it('should handle multiple words regardless of order', function() {
                            return checkFilter('Following Posts', ["Posts I'm Following"]);
                        });

                        it('should handle multiple words in different depths', function() {
                            return checkFilter('Parent Child', ['Parent', 'Target', 'Child']);
                        });
                    });
                });

                describe('selecting an item', function() {
                    var testSelectionRequest;

                    it('should show/hide the cohort selector', function() {
                        var self = this;
                        DiscussionSpecHelper.makeModerator();
                        this.view.render();
                        setupAjax();
                        return _.each([
                            {
                                selector: '.forum-nav-browse-menu-all',
                                cohortVisibility: true
                            }, {
                                selector: '.forum-nav-browse-menu-following',
                                cohortVisibility: false
                            }, {
                                selector: '.forum-nav-browse-menu-item:' +
                                            'has(.forum-nav-browse-menu-item .forum-nav-browse-menu-item)',
                                cohortVisibility: false
                            }, {
                                selector: '[data-discussion-id=child]',
                                cohortVisibility: false
                            }, {
                                selector: '[data-discussion-id=other]',
                                cohortVisibility: true
                            }
                        ], function(itemInfo) {
                            self.view.$('' + itemInfo.selector + ' > .forum-nav-browse-title').click();
                            return expect(self.view.$('.forum-nav-filter-cohort').is(':visible'))
                                .toEqual(itemInfo.cohortVisibility);
                        });
                    });

                    testSelectionRequest = function(callback, itemText) {
                        setupAjax(callback);
                        $('.forum-nav-browse-title:contains(' + itemText + ')').click();
                        return expect($.ajax).toHaveBeenCalled();
                    };

                    it('should get all discussions', function() {
                        return testSelectionRequest(function(params) {
                            return expect(params.url.path()).toEqual(DiscussionUtil.urlFor('threads'));
                        }, 'All');
                    });

                    it('should get followed threads', function() {
                        testSelectionRequest(function(params) {
                            return expect(params.url.path())
                                .toEqual(DiscussionUtil.urlFor('followed_threads', window.user.id));
                        }, 'Following');
                        return expect($.ajax.calls.mostRecent().args[0].data.group_id).toBeUndefined();
                    });

                    it('should get threads for the selected leaf', function() {
                        return testSelectionRequest(function(params) {
                            expect(params.url.path()).toEqual(DiscussionUtil.urlFor('search'));
                            return expect(params.data.commentable_ids).toEqual('child');
                        }, 'Child');
                    });

                    it('should get threads for children of the selected intermediate node', function() {
                        return testSelectionRequest(function(params) {
                            expect(params.url.path()).toEqual(DiscussionUtil.urlFor('search'));
                            return expect(params.data.commentable_ids).toEqual('child,sibling');
                        }, 'Parent');
                    });
                });
            });

            describe('DiscussionSearchView', function() {
                var view;
                beforeEach(function() {
                    setFixtures('<div class="search-container"></div>');
                    view = new DiscussionSearchView({
                        el: $('.search-container'),
                        discussionBoardView: {
                            performSearch: jasmine.createSpy()
                        }
                    }).render();
                });

                describe('Search events', function() {
                    it('perform search when enter pressed inside search textfield', function() {
                        view.$el.find('.search-input').trigger($.Event('keydown', {
                            which: constants.keyCodes.enter
                        }));
                        expect(view.discussionBoardView.performSearch).toHaveBeenCalled();
                    });

                    it('perform search when search icon is clicked', function() {
                        view.$el.find('.search-btn').click();
                        expect(view.discussionBoardView.performSearch).toHaveBeenCalled();
                    });
                });
            });

            describe('search alerts', function() {
                var testAlertMessages, getAlertMessagesAndClasses;

                testAlertMessages = function(expectedMessages) {
                    return expect($('.search-alert .message').map(function() {
                        return $(this).html();
                    }).get()).toEqual(expectedMessages);
                };

                getAlertMessagesAndClasses = function() {
                    return $('.search-alert').map(function() {
                        return {
                            text: $('.message', this).html(),
                            css_class: $(this).attr('class')
                        };
                    }).get();
                };

                it('renders and removes search alerts', function() {
                    var bar, foo;
                    testAlertMessages([]);
                    foo = this.view.addSearchAlert('foo');
                    testAlertMessages(['foo']);
                    bar = this.view.addSearchAlert('bar');
                    testAlertMessages(['foo', 'bar']);
                    this.view.removeSearchAlert(foo.cid);
                    testAlertMessages(['bar']);
                    this.view.removeSearchAlert(bar.cid);
                    return testAlertMessages([]);
                });

                it('renders search alert with custom class', function() {
                    var messages;
                    testAlertMessages([]);

                    this.view.addSearchAlert('foo', 'custom-class');
                    messages = getAlertMessagesAndClasses();
                    expect(messages.length).toEqual(1);
                    expect(messages[0].text).toEqual('foo');
                    expect(messages[0].css_class).toEqual('search-alert custom-class');

                    this.view.addSearchAlert('bar', 'other-class');

                    messages = getAlertMessagesAndClasses();
                    expect(messages.length).toEqual(2);
                    expect(messages[0].text).toEqual('foo');
                    expect(messages[0].css_class).toEqual('search-alert custom-class');
                    expect(messages[1].text).toEqual('bar');
                    expect(messages[1].css_class).toEqual('search-alert other-class');
                });


                it('clears all search alerts', function() {
                    this.view.addSearchAlert('foo');
                    this.view.addSearchAlert('bar');
                    this.view.addSearchAlert('baz');
                    testAlertMessages(['foo', 'bar', 'baz']);
                    this.view.clearSearchAlerts();
                    return testAlertMessages([]);
                });
            });

            describe('search spell correction', function() {
                var testCorrection;

                beforeEach(function() {
                    return spyOn(this.view, 'searchForUser');
                });

                testCorrection = function(view, correctedText) {
                    spyOn(view, 'addSearchAlert');
                    $.ajax.and.callFake(function(params) {
                        params.success({
                            discussion_data: [],
                            page: 42,
                            num_pages: 99,
                            corrected_text: correctedText
                        }, 'success');
                        return {
                            always: function() {
                            }
                        };
                    });
                    view.searchFor('dummy');
                    return expect($.ajax).toHaveBeenCalled();
                };

                it('adds a search alert when an alternate term was searched', function() {
                    testCorrection(this.view, 'foo');
                    expect(this.view.addSearchAlert.calls.count()).toEqual(1);
                    return expect(this.view.addSearchAlert.calls.mostRecent().args[0]).toMatch(/foo/);
                });

                it('does not add a search alert when no alternate term was searched', function() {
                    testCorrection(this.view, null);
                    expect(this.view.addSearchAlert.calls.count()).toEqual(1);
                    return expect(this.view.addSearchAlert.calls.mostRecent().args[0]).toMatch(/no threads matched/i);
                });

                it('clears search alerts when a new search is performed', function() {
                    spyOn(this.view, 'clearSearchAlerts');
                    spyOn(DiscussionUtil, 'safeAjax');
                    this.view.searchFor('dummy');
                    return expect(this.view.clearSearchAlerts).toHaveBeenCalled();
                });

                it('clears search alerts when the underlying collection changes', function() {
                    spyOn(this.view, 'clearSearchAlerts');
                    spyOn(this.view, 'renderThread');
                    this.view.collection.trigger('change', new Thread({
                        id: 1
                    }));
                    return expect(this.view.clearSearchAlerts).toHaveBeenCalled();
                });
            });

            describe('username search', function() {
                var setAjaxResults;

                it('makes correct ajax calls', function() {
                    $.ajax.and.callFake(function(params) {
                        expect(params.data.username).toEqual('testing-username');
                        expect(params.url.path()).toEqual(DiscussionUtil.urlFor('users'));
                        params.success({
                            users: []
                        }, 'success');
                        return {
                            always: function() {
                            }
                        };
                    });
                    this.view.searchForUser('testing-username');
                    return expect($.ajax).toHaveBeenCalled();
                });

                setAjaxResults = function(threadSuccess, userResult) {
                    return $.ajax.and.callFake(function(params) {
                        if (params.data.text && threadSuccess) {
                            params.success({
                                discussion_data: [],
                                page: 42,
                                num_pages: 99,
                                corrected_text: 'dummy'
                            }, 'success');
                        } else if (params.data.username) {
                            params.success({
                                users: userResult
                            }, 'success');
                        }
                        return {
                            always: function() {
                            }
                        };
                    });
                };

                it('gets called after a thread search succeeds', function() {
                    spyOn(this.view, 'searchForUser').and.callThrough();
                    setAjaxResults(true, []);
                    this.view.searchFor('gizmo');
                    expect(this.view.searchForUser).toHaveBeenCalled();
                    return expect($.ajax.calls.mostRecent().args[0].data.username).toEqual('gizmo');
                });

                it('does not get called after a thread search fails', function() {
                    spyOn(this.view, 'searchForUser').and.callThrough();
                    setAjaxResults(false, []);
                    this.view.searchFor('gizmo');
                    return expect(this.view.searchForUser).not.toHaveBeenCalled();
                });

                it('adds a search alert when an username was matched', function() {
                    spyOn(this.view, 'addSearchAlert');
                    setAjaxResults(true, [
                        {
                            username: 'gizmo',
                            id: '1'
                        }
                    ]);
                    this.view.searchForUser('dummy');
                    expect($.ajax).toHaveBeenCalled();
                    expect(this.view.addSearchAlert).toHaveBeenCalled();
                    return expect(this.view.addSearchAlert.calls.mostRecent().args[0]).toMatch(/gizmo/);
                });

                it('does not add a search alert when no username was matched', function() {
                    spyOn(this.view, 'addSearchAlert');
                    setAjaxResults(true, []);
                    this.view.searchForUser('dummy');
                    expect($.ajax).toHaveBeenCalled();
                    return expect(this.view.addSearchAlert).not.toHaveBeenCalled();
                });
            });
        });
    }
);
