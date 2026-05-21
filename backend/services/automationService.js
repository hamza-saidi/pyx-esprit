const { Automation, Contact, ModeleEmail, EnvoiEmail, Tag } = require('../models');
const emailService = require('./emailService');
const { Op } = require('sequelize');

/**
 * Service to handle triggered automations (Customer Journeys)
 */
class AutomationService {
  /**
   * Trigger automations based on an event
   * @param {string} triggerType - 'contact_added' | 'tag_added'
   * @param {object} data - { contact, tagName (string) | tagNames (array) }
   */
  async triggerAutomation(triggerType, data) {
    const { contact, tagName, tagNames } = data;
    const finalTagNames = tagNames || (tagName ? [tagName] : []);

    if (!contact || !contact.id) {
      console.warn('[AUTOMATION] Trigger called without valid contact data');
      return;
    }

    try {
      // Find all active custom automations
      const activeAutomations = await Automation.findAll({
        where: {
          type: 'custom',
          actif: true
        }
      });

      for (const auto of activeAutomations) {
        let config = auto.config;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {}
        }

        if (!config || config.trigger !== triggerType) continue;

        // If it's a tag_added trigger, check if any of the tagNames matches the condition
        if (triggerType === 'tag_added') {
          if (!config.condition || !finalTagNames.includes(config.condition)) {
            continue;
          }
        }

        // We have a match! Now execute the action.
        await this.executeAction(auto, contact, config);
      }
    } catch (err) {
      console.error('[AUTOMATION] Error during trigger execution:', err);
    }
  }

  /**
   * Check and run all pending scheduled/recurring automations
   * This should be called by a cron job (e.g. every hour)
   */
  async processScheduledAutomations() {
    console.log('[AUTOMATION] Checking for due scheduled/recurring automations...');
    try {
      const activeScheduled = await Automation.findAll({
        where: {
          actif: true,
          type: 'custom'
        }
      });

      const now = new Date();

      for (const auto of activeScheduled) {
        let config = auto.config;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {}
        }

        if (!config || config.trigger !== 'scheduled') continue;

        if (this._isDue(auto, config, now)) {
          console.log(`[AUTOMATION] Automation "${auto.nom}" is DUE. Executing...`);
          await this.executeBulkAction(auto, config);
        }
      }
    } catch (err) {
      console.error('[AUTOMATION] Error in processScheduledAutomations:', err);
    }
  }

  /**
   * Process membership-specific automation logic (Reminders + Auto-Expiry)
   */
  async processMembershipTasks() {
    console.log('[AUTOMATION] Checking membership tasks (Expires & Reminders)...');
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // 1. Auto-Expiry: Switch Active to Expired if date passed
      const expiredCount = await Contact.update(
        { statut_abonnement: 'expiré' },
        { 
          where: { 
            statut_abonnement: 'actif',
            date_expiration_abonnement: { [Op.lt]: now }
          } 
        }
      );
      if (expiredCount[0] > 0) console.log(`[AUTOMATION] ${expiredCount[0]} memberships marked as EXPIRED.`);

      // 2. Reminders: Find automations with trigger 'membership_expiring'
      const expiringAutomations = await Automation.findAll({
        where: { actif: true, type: 'custom' }
      });

      for (const auto of expiringAutomations) {
        let config = auto.config;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch (e) {}
        }
        if (!config || config.trigger !== 'membership_expiring') continue;

        const daysBefore = parseInt(config.days_before) || 30;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysBefore);
        const targetDayStr = targetDate.toISOString().slice(0, 10);

        // Find contacts expiring on that specific day
        const contacts = await Contact.findAll({
          where: {
            statut_abonnement: 'actif',
            date_expiration_abonnement: {
              [Op.and]: [
                { [Op.gte]: new Date(targetDayStr + ' 00:00:00') },
                { [Op.lte]: new Date(targetDayStr + ' 23:59:59') }
              ]
            }
          }
        });

        if (contacts.length > 0) {
          console.log(`[AUTOMATION] Triggering "${auto.nom}" for ${contacts.length} contacts expiring in ${daysBefore} days.`);
          for (const contact of contacts) {
            // isRecurring=true for reminders so they can be sent even if they had other automations
            await this.executeAction(auto, contact, config, true);
          }
        }
      }
    } catch (err) {
      console.error('[AUTOMATION] Error in processMembershipTasks:', err);
    }
  }

  /**
   * Determine if a scheduled automation should run now
   */
  _isDue(automation, config, now) {
    const scheduledDate = new Date(config.scheduled_date || automation.date_creation);
    if (now < scheduledDate) return false;

    // If it never ran, it's due if start date passed
    if (!automation.derniere_execution) return true;

    const lastRun = new Date(automation.derniere_execution);
    const frequency = config.recurrence || 'once';

    switch (frequency) {
      case 'daily':
        return (now.getTime() - lastRun.getTime()) >= 23 * 60 * 60 * 1000; // ~24h
      case 'weekly':
        return (now.getTime() - lastRun.getTime()) >= 6 * 24 * 60 * 60 * 1000; // ~7 days
      case 'monthly':
      {
        const nextMonth = new Date(lastRun);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return now >= nextMonth;
      }
      case 'yearly':
      {
        const nextYear = new Date(lastRun);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return now >= nextYear;
      }
      case 'once':
      default:
        // Already ran once and frequency is 'once'
        return false;
    }
  }

  /**
   * Run an automation for a whole group of contacts
   */
  async executeBulkAction(automation, config) {
    try {
      const tagCondition = config.audience_tag;
      if (!tagCondition) {
        console.warn(`[AUTOMATION] No audience tag defined for bulk automation ${automation.id}`);
        return;
      }

      // Find contacts with the specific tag
      const contacts = await Contact.findAll({
        include: [{
          model: Tag,
          as: 'tags',
          where: { nom: tagCondition },
          through: { attributes: [] }
        }]
      });

      console.log(`[AUTOMATION] Executing bulk action for ${contacts.length} contacts (Tag: ${tagCondition})`);

      for (const contact of contacts) {
        // executeAction handles duplicate prevention per automation instance
        // but for recurring, we need to allow resending if it's a NEW run
        const isRecurring = config.recurrence && config.recurrence !== 'once';
        await this.executeAction(automation, contact, config, isRecurring);
      }

      // Update automation last run
      await automation.update({ derniere_execution: new Date() });

    } catch (err) {
      console.error(`[AUTOMATION] Bulk execution failed for ${automation.id}:`, err);
    }
  }

  /**
   * Execute the action defined in the automation
   */
  async executeAction(automation, contact, config, skipDuplicateCheck = false) {
    const templateId = config.action_template_id;
    const quickMessage = config.quick_message;
    
    if (!templateId && !quickMessage) return;

    try {
      // 1. Duplicate Prevention (Optional for recurring)
      // For recurring, we use a token that includes the DATE of execution or we just check recent sends
      const runId = skipDuplicateCheck ? new Date().toISOString().slice(0, 10) : 'fixed';
      const tokenPrefix = `auto-${automation.id}-${runId}-`;

      const alreadySent = await EnvoiEmail.findOne({
        where: {
          contact_id: contact.id,
          token_tracking: { [Op.like]: `${tokenPrefix}%` }
        }
      });

      if (alreadySent) {
        // We still log skipping only if it's not a massive bulk to avoid log bloat
        return;
      }

      // 2. Prepare Content
      let html = '';
      let subject = automation.nom;

      if (templateId) {
        const template = await ModeleEmail.findByPk(templateId);
        if (template) {
          html = template.contenu_html || '';
          subject = template.nom || subject;
        }
      } else if (quickMessage) {
        html = this._wrapQuickMessage(quickMessage);
      }

      // Variable replacement
      const variables = {
        prenom: contact.prenom || '',
        nom: contact.nom || '',
        email: contact.email || ''
      };

      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, variables[key]);
      });

      // 3. Send Email
      const token = `${tokenPrefix}${contact.id}-${Date.now()}`;
      
      const res = await emailService.sendGenericEmail(contact.email, subject, html);

      if (res.success) {
        // 4. Track in EnvoiEmail
        await EnvoiEmail.create({
          campagne_id: null,
          contact_id: contact.id,
          email_destinataire: contact.email,
          statut: 'envoyé',
          date_envoi: new Date(),
          token_tracking: token,
          actif: true
        });

        if (!skipDuplicateCheck) {
          await automation.update({ derniere_execution: new Date() });
        }
      }

    } catch (err) {
      console.error(`[AUTOMATION] Failed to execute action for automation ${automation.id}:`, err);
    }
  }

  _wrapQuickMessage(message) {
    return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f1f7f6; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; border-top: 5px solid #204170;">
        <div style="margin-bottom: 30px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #888; text-align: center;">
          Sent via <strong>Golf Huub Automations</strong>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new AutomationService();
