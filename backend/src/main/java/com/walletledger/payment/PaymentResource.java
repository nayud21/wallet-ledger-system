package com.walletledger.payment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.walletledger.payment.dto.PaymentEventResponse;
import com.walletledger.payment.dto.WebhookRequest;
import com.walletledger.shared.PageResponse;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;

import java.util.List;

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

    @GET
    @Path("/events")
    public PageResponse<PaymentEventResponse> listEvents(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size,
            @QueryParam("status") String status) {
        String query = status != null ? "status = ?1 order by createdAt desc" : "order by createdAt desc";
        List<PaymentEvent> events = status != null
                ? repository.find(query, status).page(page, size).list()
                : repository.find(query).page(page, size).list();
        long total = status != null
                ? repository.count("status = ?1", status)
                : repository.count();
        List<PaymentEventResponse> data = events.stream().map(PaymentEventResponse::from).toList();
        return new PageResponse<>(data, total, page, size);
    }
}
