"""
This module contains tasks for asynchronous execution of grade updates.
"""

from celery import task
from datetime import datetime
from django.conf import settings
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from logging import getLogger
from pytz import UTC

from courseware.models import StudentModule
from lms.djangoapps.course_blocks.api import get_course_blocks
from opaque_keys.edx.keys import UsageKey
from opaque_keys.edx.locator import CourseLocator
from openedx.core.djangoapps.content.block_structure.api import get_course_in_cache
from xmodule.modulestore.django import modulestore

from .config.models import PersistentGradesEnabledFlag
from .new.course_grade import CourseGradeFactory
from .new.subsection_grade import SubsectionGradeFactory
from .signals.signals import SUBSECTION_SCORE_CHANGED
from .transformer import GradesTransformer

log = getLogger(__name__)


@task(default_retry_delay=30, routing_key=settings.RECALCULATE_GRADES_ROUTING_KEY)
def recalculate_subsection_grade(user_id, course_id, usage_id, only_if_higher, modified_time_string):
    """
    Updates a saved subsection grade.
    This method expects the following parameters:
        - user_id: serialized id of applicable User object
        - course_id: Unicode string representing the course
        - usage_id: Unicode string indicating the courseware instance
        - only_if_higher: boolean indicating whether grades should
        be updated only if the new grade is higher than the previous
        value.
        - modified_time_string: timestamp for when the subsection grade
        update was fired
    """
    if not PersistentGradesEnabledFlag.feature_enabled(course_id):
        return

    course_key = CourseLocator.from_string(course_id)
    student = User.objects.get(id=user_id)
    scored_block_usage_key = UsageKey.from_string(usage_id).replace(course_key=course_key)
    if modified_time_string:
        student_module = StudentModule.objects.get(
            student_id=user_id,
            module_state_key=scored_block_usage_key,
            course_id=course_key,
        )
        read_time = student_module.modified
        modified_time = datetime.strptime(modified_time_string, "%y/%m/%d/%H/%M/%S/%f").replace(tzinfo=UTC)

        # if the student module was updated after the subsection update
        # was initiated, the subsection update will attempt to use the
        # learner's previous problem score, so we retry the subsection
        # grade update here instead of proceeding.
        if read_time > modified_time:
            _retry_recalculate_subsection_grade(user_id, course_id, usage_id, only_if_higher, modified_time_string)

    collected_block_structure = get_course_in_cache(course_key)
    course = modulestore().get_course(course_key, depth=0)
    subsection_grade_factory = SubsectionGradeFactory(student, course, collected_block_structure)
    subsections_to_update = collected_block_structure.get_transformer_block_field(
        scored_block_usage_key,
        GradesTransformer,
        'subsections',
        set()
    )

    try:
        for subsection_usage_key in subsections_to_update:
            transformed_subsection_structure = get_course_blocks(
                student,
                subsection_usage_key,
                collected_block_structure=collected_block_structure,
            )
            subsection_grade = subsection_grade_factory.update(
                transformed_subsection_structure[subsection_usage_key],
                transformed_subsection_structure,
                only_if_higher,
            )
            SUBSECTION_SCORE_CHANGED.send(
                sender=recalculate_subsection_grade,
                course=course,
                user=student,
                subsection_grade=subsection_grade,
            )

    except IntegrityError as exc:
        _retry_recalculate_subsection_grade(user_id, course_id, usage_id, only_if_higher, modified_time_string, exc)


@task(default_retry_delay=30, routing_key=settings.RECALCULATE_GRADES_ROUTING_KEY)
def recalculate_course_grade(user_id, course_id):
    """
    Updates a saved course grade.
    This method expects the following parameters:
       - user_id: serialized id of applicable User object
       - course_id: Unicode string representing the course
    """
    if not PersistentGradesEnabledFlag.feature_enabled(course_id):
        return
    student = User.objects.get(id=user_id)
    course_key = CourseLocator.from_string(course_id)
    course = modulestore().get_course(course_key, depth=0)

    try:
        CourseGradeFactory(student).update(course)
    except IntegrityError as exc:
        raise recalculate_course_grade.retry(args=[user_id, course_id], exc=exc)


def _retry_recalculate_subsection_grade(user_id, course_id, usage_id, only_if_higher, modified_time_string, exc=None):
    """
    Calls retry for the recalculate_subsection_grade task with the
    given inputs.
    """
    raise recalculate_subsection_grade.retry(
        args=[
            user_id,
            course_id,
            usage_id,
            only_if_higher,
            modified_time_string
        ],
        exc=exc
    )
