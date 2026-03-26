import { GetnetPaymentStatus, mapGetnetStatus, isTerminalStatus, TERMINAL_STATUSES } from '../getnet-transaction.entity';

describe('GetnetTransaction Entity', () => {
    describe('mapGetnetStatus', () => {
        it('should map pending statuses correctly', () => {
            expect(mapGetnetStatus('pending')).toBe('pending');
            expect(mapGetnetStatus('created')).toBe('pending');
        });

        it('should map processing statuses correctly', () => {
            expect(mapGetnetStatus('processing')).toBe('processing');
            expect(mapGetnetStatus('in_progress')).toBe('processing');
        });

        it('should map approved statuses correctly', () => {
            expect(mapGetnetStatus('approved')).toBe('approved');
            expect(mapGetnetStatus('success')).toBe('approved');
            expect(mapGetnetStatus('completed')).toBe('approved');
        });

        it('should map rejected statuses correctly', () => {
            expect(mapGetnetStatus('rejected')).toBe('rejected');
            expect(mapGetnetStatus('declined')).toBe('rejected');
            expect(mapGetnetStatus('failed')).toBe('rejected');
        });

        it('should map cancelled statuses correctly', () => {
            expect(mapGetnetStatus('cancelled')).toBe('cancelled');
            expect(mapGetnetStatus('canceled')).toBe('cancelled');
        });

        it('should map expired statuses correctly', () => {
            expect(mapGetnetStatus('expired')).toBe('expired');
            expect(mapGetnetStatus('timeout')).toBe('expired');
        });

        it('should handle case insensitivity', () => {
            expect(mapGetnetStatus('APPROVED')).toBe('approved');
            expect(mapGetnetStatus('Rejected')).toBe('rejected');
        });

        it('should handle underscore and hyphen variations', () => {
            expect(mapGetnetStatus('in-progress')).toBe('processing');
            expect(mapGetnetStatus('in_progress')).toBe('processing');
        });

        it('should default to processing for unknown statuses', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            expect(mapGetnetStatus('unknown')).toBe('processing');
            expect(mapGetnetStatus('random_status')).toBe('processing');
            consoleSpy.mockRestore();
        });
    });

    describe('isTerminalStatus', () => {
        it('should return true for terminal statuses', () => {
            expect(isTerminalStatus('approved')).toBe(true);
            expect(isTerminalStatus('rejected')).toBe(true);
            expect(isTerminalStatus('cancelled')).toBe(true);
            expect(isTerminalStatus('expired')).toBe(true);
        });

        it('should return false for non-terminal statuses', () => {
            expect(isTerminalStatus('pending')).toBe(false);
            expect(isTerminalStatus('processing')).toBe(false);
        });
    });

    describe('status flow validation', () => {
        const validStatuses: GetnetPaymentStatus[] = ['pending', 'processing', 'approved', 'rejected', 'cancelled', 'expired'];

        it('should have all expected statuses defined', () => {
            validStatuses.forEach(status => {
                expect(typeof status).toBe('string');
            });
        });

        it('should correctly identify terminal statuses', () => {
            const terminalStatuses: GetnetPaymentStatus[] = ['approved', 'rejected', 'cancelled', 'expired'];
            const nonTerminalStatuses: GetnetPaymentStatus[] = ['pending', 'processing'];

            terminalStatuses.forEach(status => {
                expect(isTerminalStatus(status)).toBe(true);
            });

            nonTerminalStatuses.forEach(status => {
                expect(isTerminalStatus(status)).toBe(false);
            });
        });
    });
});

describe('Idempotency Logic', () => {
    describe('terminal state detection', () => {
        it('should identify approved as terminal', () => {
            expect(isTerminalStatus('approved')).toBe(true);
        });

        it('should identify rejected as terminal', () => {
            expect(isTerminalStatus('rejected')).toBe(true);
        });

        it('should identify cancelled as terminal', () => {
            expect(isTerminalStatus('cancelled')).toBe(true);
        });

        it('should identify expired as terminal', () => {
            expect(isTerminalStatus('expired')).toBe(true);
        });

        it('should not identify pending as terminal', () => {
            expect(isTerminalStatus('pending')).toBe(false);
        });

        it('should not identify processing as terminal', () => {
            expect(isTerminalStatus('processing')).toBe(false);
        });
    });

    describe('webhook event deduplication logic', () => {
        function shouldProcessEvent(
            currentStatus: GetnetPaymentStatus,
            newStatus: GetnetPaymentStatus,
            isTerminal: boolean
        ): boolean {
            // Don't process if already in terminal state
            if (isTerminal) {
                return false;
            }
            // Process if status changed
            if (currentStatus !== newStatus) {
                return true;
            }
            // Don't process if same status (likely duplicate)
            return false;
        }

        it('should not process events for terminal transactions', () => {
            const result = shouldProcessEvent('approved', 'approved', true);
            expect(result).toBe(false);
        });

        it('should process events for non-terminal transactions', () => {
            const result = shouldProcessEvent('pending', 'processing', false);
            expect(result).toBe(true);
        });

        it('should not process duplicate events for non-terminal transactions', () => {
            const result = shouldProcessEvent('processing', 'processing', false);
            expect(result).toBe(false);
        });

        it('should process transition to terminal state', () => {
            const result = shouldProcessEvent('processing', 'approved', false);
            expect(result).toBe(true);
        });
    });

    describe('TERMINAL_STATUSES constant', () => {
        it('should contain only terminal statuses', () => {
            expect(TERMINAL_STATUSES).toContain('approved');
            expect(TERMINAL_STATUSES).toContain('rejected');
            expect(TERMINAL_STATUSES).toContain('cancelled');
            expect(TERMINAL_STATUSES).toContain('expired');
            expect(TERMINAL_STATUSES).not.toContain('pending');
            expect(TERMINAL_STATUSES).not.toContain('processing');
        });

        it('should have 4 terminal statuses', () => {
            expect(TERMINAL_STATUSES).toHaveLength(4);
        });
    });
});
