import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set, computed, observer } from '@ember/object';
import NewOrEdit from 'ui/mixins/new-or-edit';
import ChildHook from 'shared/mixins/child-hook';
import { isEmpty } from '@ember/utils';

const M_CONFIG = {
  type:                  'projectRoleTemplateBinding',
  subjectKind:           '',
  userId:                '',
  projectRoleTemplateId: '',
  projectId:             '',
};

export default Component.extend(NewOrEdit, ChildHook, {
  intl:                        service(),
  router:                      service(),
  globalStore:                 service(),
  layout,
  memberConfig:                M_CONFIG,
  model:                       null,
  podSecurityPolicyTemplateId: null,
  isNew:                       false,

  primaryResource:             alias('model.project'),
  secPolicy:                   alias('model.project.defaultPodSecurityPolicyTemplateId'),
  policies:                    alias('model.policies'),
  init() {
    this._super(...arguments);
    let bindings = (get(this, 'model.project.projectRoleTemplateBindings') || []).slice();

    bindings = bindings.filter((x) => get(x, 'name') !== 'creator');
    set(this, 'memberArray', bindings);
    set(this, 'podSecurityPolicyTemplateId', get(this, 'model.project.podSecurityPolicyTemplateId'));
    if (isEmpty(get(this, 'primaryResource.id'))) {
      set(this, 'isNew', true);
    }
  },

  actions: {
    cancel() {
      this.goBack();
    },

    expandFn() {
    },

    updateQuota(quota) {
      if ( quota ) {
        set(this, 'primaryResource.resourceQuota', { limit: quota });
      } else {
        set(this, 'primaryResource.resourceQuota', null);
      }
    },

    updateNsDefaultQuota(quota) {
      if ( quota ) {
        set(this, 'primaryResource.namespaceDefaultResourceQuota', { limit: quota });
      } else {
        set(this, 'primaryResource.namespaceDefaultResourceQuota', null);
      }
    },
  },

  pspDidChange: observer('podSecurityPolicyTemplateId', function() {
    set(this, 'model.project.podSecurityPolicyTemplateId', get(this, 'podSecurityPolicyTemplateId'));
  }),
  creator:         computed('primaryResource.creatorId', function() {
    let cid = get(this, 'primaryResource.creatorId');
    let creator = null;

    if (get(this, 'editing')) {
      let users = get(this, 'model.users');

      creator = users.findBy('id', cid) || users.findBy('username', cid); // TODO 2.0 must do because first clusters and projects are given admin as the creator id which is not the admins userid
    } else {
      creator = get(this, 'model.me');
    }

    return creator;
  }),

  goBack() {
    get(this, 'router').transitionTo('authenticated.cluster.projects.index');
  },

  didSave() {
    const pr = get(this, 'primaryResource');
    const podSecurityPolicyTemplateId = get(this, 'podSecurityPolicyTemplateId') ? get(this, 'podSecurityPolicyTemplateId') : null;

    return pr.waitForCondition('BackingNamespaceCreated').then(() => this.applyHooks().then(() => {
      pr.doAction('setpodsecuritypolicytemplate', { podSecurityPolicyTemplateId, }).then(() => pr);
    }));
  },

  doneSaving() {
    this.goBack();
  },

});
