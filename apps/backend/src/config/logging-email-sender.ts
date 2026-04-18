import { Logger } from '@vendure/core';
import {
    EmailDetails,
    EmailSender,
    EmailTransportOptions,
    NodemailerEmailSender,
} from '@vendure/email-plugin';

const LOGGER_CTX = 'EmailDelivery';

function describeEmail(email: EmailDetails, options: EmailTransportOptions): string {
    const parts = [
        `transport=${options.type}`,
        `to=${email.recipient}`,
        `subject="${email.subject}"`,
    ];

    if (email.cc) {
        parts.push(`cc=${email.cc}`);
    }
    if (email.bcc) {
        parts.push(`bcc=${email.bcc}`);
    }

    return parts.join(' ');
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export class LoggingEmailSender implements EmailSender {
    private readonly delegate = new NodemailerEmailSender();

    async send(email: EmailDetails, options: EmailTransportOptions): Promise<void> {
        const summary = describeEmail(email, options);

        Logger.info(`Email send started: ${summary}`, LOGGER_CTX);

        try {
            await this.delegate.send(email, options);
            Logger.info(`Email send completed: ${summary}`, LOGGER_CTX);
        } catch (error) {
            Logger.error(`Email send failed: ${summary}. ${getErrorMessage(error)}`, LOGGER_CTX);
            throw error;
        }
    }
}
