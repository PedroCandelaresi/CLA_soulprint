import { EmailDetails, EmailSender, EmailTransportOptions, NodemailerEmailSender } from '@vendure/email-plugin';

const EMAIL_LOG_PREFIX = '[email]';

function maskEmail(email: string | undefined | null): string {
    if (!email) {
        return '(empty)';
    }
    const [localPart = '', domain = ''] = email.split('@');
    if (!domain) {
        return email;
    }
    const safeLocal = localPart.length <= 2
        ? `${localPart[0] || '*'}*`
        : `${localPart.slice(0, 2)}***`;
    return `${safeLocal}@${domain}`;
}

function describeTransport(options: EmailTransportOptions): string {
    switch (options.type) {
        case 'smtp':
            return `smtp host=${options.host || '(unset)'} port=${options.port || '(unset)'} secure=${String(options.secure)} user=${maskEmail(typeof options.auth === 'object' ? (options.auth?.user as string | undefined) : undefined)}`;
        case 'file':
            return `file outputPath=${options.outputPath}`;
        case 'sendmail':
            return `sendmail path=${options.path || 'sendmail'}`;
        case 'ses':
            return 'ses';
        case 'testing':
            return 'testing';
        case 'none':
            return 'none';
        default:
            return 'unknown';
    }
}

export class LoggingEmailSender implements EmailSender {
    private readonly delegate = new NodemailerEmailSender();

    async send(email: EmailDetails, options: EmailTransportOptions): Promise<void> {
        const startedAt = Date.now();
        console.log(
            `${EMAIL_LOG_PREFIX} Attempting send: recipient=${maskEmail(email.recipient)} subject="${email.subject}" transport=${describeTransport(options)}`,
        );

        try {
            await this.delegate.send(email, options);
            console.log(
                `${EMAIL_LOG_PREFIX} Send succeeded: recipient=${maskEmail(email.recipient)} subject="${email.subject}" durationMs=${Date.now() - startedAt}`,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(
                `${EMAIL_LOG_PREFIX} Send failed: recipient=${maskEmail(email.recipient)} subject="${email.subject}" durationMs=${Date.now() - startedAt} error=${message}`,
            );
            throw error;
        }
    }
}
