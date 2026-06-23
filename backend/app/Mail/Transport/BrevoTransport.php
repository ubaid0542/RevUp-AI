<?php

namespace App\Mail\Transport;

use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mailer\Exception\TransportException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoTransport extends AbstractTransport
{
    /**
     * The Brevo API Key.
     */
    protected string $apiKey;

    /**
     * Create a new Brevo transport instance.
     */
    public function __construct(string $apiKey)
    {
        parent::__construct();
        $this->apiKey = $apiKey;
    }

    /**
     * Send the given message.
     */
    protected function doSend(SentMessage $sentMessage): void
    {
        $email = $sentMessage->getOriginalMessage();
        if (!$email instanceof Email) {
            throw new TransportException('Message must be an instance of Symfony\Component\Mime\Email');
        }

        // Get recipients
        $to = [];
        foreach ($email->getTo() as $address) {
            $to[] = [
                'email' => $address->getAddress(),
                'name' => $address->getName() ?: null,
            ];
        }

        // Get sender
        $from = null;
        $fromAddresses = $email->getFrom();
        if (!empty($fromAddresses)) {
            $fromAddress = $fromAddresses[0];
            $from = [
                'email' => $fromAddress->getAddress(),
                'name' => $fromAddress->getName() ?: null,
            ];
        } else {
            $from = [
                'email' => config('mail.from.address'),
                'name' => config('mail.from.name', 'RevUp AI'),
            ];
        }

        // Get body content
        $html = $email->getHtmlBody();
        $text = $email->getTextBody();

        // Make HTTP request to Brevo API
        Log::info('Attempting to send email via Brevo API to: ' . implode(', ', array_column($to, 'email')));
        
        $response = Http::withHeaders([
            'api-key' => $this->apiKey,
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->post('https://api.brevo.com/v3/smtp/email', [
            'sender' => $from,
            'to' => $to,
            'subject' => $email->getSubject(),
            'htmlContent' => $html,
            'textContent' => $text,
        ]);

        if ($response->failed()) {
            Log::error('Brevo API request failed: ' . $response->body());
            throw new TransportException('Brevo API request failed: ' . $response->body());
        }

        Log::info('Email sent successfully via Brevo API.');
    }

    /**
     * Get the string representation of the transport.
     */
    public function __toString(): string
    {
        return 'brevo';
    }
}
