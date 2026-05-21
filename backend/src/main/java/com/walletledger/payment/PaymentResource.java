package com.walletledger.payment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.walletledger.payment.dto.WebhookRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

@Path("/api/v1/payment")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class PaymentResource {

    private final PaymentEventRepository repository;
    private final ObjectMapper objectMapper;

    @POST
    @Path("/webhook")
    @Transactional
    public Response receiveWebhook(@Valid WebhookRequest request) {
        if (repository.existsByProviderAndExternalRef(request.provider(), request.externalRef())) {
            return Response.ok().build();
        }

        PaymentEvent event = new PaymentEvent();
        event.provider = request.provider();
        event.externalRef = request.externalRef();
        try {
            event.payload = objectMapper.writeValueAsString(request.payload());
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Invalid payload");
        }
        repository.persist(event);

        return Response.ok().build();
    }
}
