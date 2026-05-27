package com.tradesite.service;

import com.tradesite.entity.Inquiry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.admin-email:}")
    private String adminEmail;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public void sendInquiryNotification(Inquiry inquiry) {
        if (mailSender == null || adminEmail == null || adminEmail.isEmpty()) {
            log.info("Email not configured, skipping notification for inquiry from: {}", inquiry.getContactName());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(adminEmail);
            message.setSubject("[TradePlus] New Inquiry from " + inquiry.getContactName());

            StringBuilder body = new StringBuilder();
            body.append("You have received a new inquiry from the TradePlus website.\n\n");
            body.append("Contact: ").append(inquiry.getContactName()).append("\n");
            body.append("Email: ").append(inquiry.getEmail()).append("\n");
            if (inquiry.getPhone() != null && !inquiry.getPhone().isEmpty()) {
                body.append("Phone: ").append(inquiry.getPhone()).append("\n");
            }
            if (inquiry.getCompanyName() != null && !inquiry.getCompanyName().isEmpty()) {
                body.append("Company: ").append(inquiry.getCompanyName()).append("\n");
            }
            body.append("\nMessage:\n").append(inquiry.getMessage()).append("\n\n");
            body.append("---\n");
            body.append("Reply to this inquiry by emailing: ").append(inquiry.getEmail()).append("\n");

            message.setText(body.toString());
            mailSender.send(message);
            log.info("Inquiry notification sent to {}", adminEmail);
        } catch (Exception e) {
            log.error("Failed to send inquiry notification email: {}", e.getMessage());
        }
    }
}
