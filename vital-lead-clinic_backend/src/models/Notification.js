const { supabaseAdmin } = require('../config/database');

class Notification {
    static async findAll(clinicId, userId, limit = 50) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('clinic_id', clinicId)
            .or(`user_id.eq.${userId},user_id.is.null`)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    static async create(notification) {
        const {
            type = 'system',
            title,
            message,
            priority = 'medium',
            actionLabel,
            actionLink,
            metadata,
            userId,
            clinicId
        } = notification;

        const { data, error } = await supabaseAdmin
            .from('notifications')
            .insert({
                type,
                title,
                message,
                priority,
                action_label: actionLabel,
                action_link: actionLink,
                metadata: metadata || null,
                user_id: userId,
                clinic_id: clinicId
            })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    }

    static async markRead(id, clinicId, userId) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .or(`user_id.eq.${userId},user_id.is.null`)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    }

    static async markAllRead(clinicId, userId) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .update({ read: true })
            .eq('clinic_id', clinicId)
            .or(`user_id.eq.${userId},user_id.is.null`)
            .select('id');
        if (error) throw error;
        return data;
    }

    static async delete(id, clinicId, userId) {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .or(`user_id.eq.${userId},user_id.is.null`)
            .select('id')
            .single();
        if (error) throw error;
        return data;
    }

    static async clearAll(clinicId, userId) {
        const { error, count } = await supabaseAdmin
            .from('notifications')
            .delete({ count: 'exact' })
            .eq('clinic_id', clinicId)
            .or(`user_id.eq.${userId},user_id.is.null`);
        if (error) throw error;
        return { count: count || 0 };
    }

    static async countUnread(clinicId, userId) {
        const { count, error } = await supabaseAdmin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('read', false)
            .or(`user_id.eq.${userId},user_id.is.null`);
        if (error) throw error;
        return count || 0;
    }
}

module.exports = Notification;
