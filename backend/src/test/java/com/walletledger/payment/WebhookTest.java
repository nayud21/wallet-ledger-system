package com.walletledger.payment;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class WebhookTest {

    @Inject
    EntityManager em;

    @Inject
    PaymentEventRepository repository;

    @Inject
    PaymentEventProcessor processor;

    @BeforeEach
    @Transactional
    void cleanup() {
        em.createNativeQuery("DELETE FROM payment_events").executeUpdate();
    }

    @Test
    void webhook_persistsEventAsPending() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {"provider":"stripe","externalRef":"evt_001","payload":{"type":"payment_intent.succeeded"}}
                """)
        .when()
            .post("/api/v1/payment/webhook")
        .then()
            .statusCode(200);

        List<PaymentEvent> events = repository.findPending();
        assertEquals(1, events.size());
        assertEquals("stripe", events.get(0).provider);
        assertEquals("evt_001", events.get(0).externalRef);
        assertEquals("PENDING", events.get(0).status);
    }

    @Test
    void webhook_idempotency_duplicateIsIgnored() {
        String body = """
            {"provider":"stripe","externalRef":"evt_002","payload":{"type":"charge.updated"}}
            """;

        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/payment/webhook").then().statusCode(200);

        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/payment/webhook").then().statusCode(200);

        long count = repository.count("provider = 'stripe' and externalRef = 'evt_002'");
        assertEquals(1, count);
    }

    @Test
    void webhook_validation_missingProvider_returns400() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {"externalRef":"evt_003","payload":{"type":"test"}}
                """)
        .when()
            .post("/api/v1/payment/webhook")
        .then()
            .statusCode(400);
    }

    @Test
    @Transactional
    void processor_advancesPendingToProcessed() {
        PaymentEvent event = new PaymentEvent();
        event.provider = "stripe";
        event.externalRef = "evt_004";
        event.payload = "{\"type\":\"payment_intent.succeeded\"}";
        repository.persist(event);

        processor.processEvents();

        PaymentEvent updated = repository.findById(event.id);
        assertEquals("PROCESSED", updated.status);
    }
}
