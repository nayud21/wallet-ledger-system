package com.walletledger.reconciliation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.walletledger.reconciliation.dto.ReconciliationExceptionResponse;
import com.walletledger.reconciliation.dto.ReconciliationMatchResponse;
import com.walletledger.reconciliation.dto.ReconciliationRunResponse;
import com.walletledger.reconciliation.dto.StatementLine;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Path("/api/v1/statements")
@RequiredArgsConstructor
public class StatementResource {

    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private final ExternalStatementRepository statementRepository;
    private final ReconciliationService reconciliationService;

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadCsv(
            @RestForm("file") FileUpload file,
            @RestForm("provider") String provider,
            @RestForm("statementDate") String statementDate) {

        if (file == null || provider == null || provider.isBlank() || statementDate == null) {
            return Response.status(400).entity("{\"error\":\"file, provider, and statementDate are required\"}").build();
        }

        LocalDate date = LocalDate.parse(statementDate);
        List<StatementLine> lines = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.uploadedFile().toUri().toURL().openStream()))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first) { first = false; continue; } // skip header
                String[] parts = line.split(",", -1);
                if (parts.length < 4) continue;
                lines.add(new StatementLine(
                        parts[0].trim(),
                        new BigDecimal(parts[1].trim()),
                        parts[2].trim().toUpperCase(),
                        LocalDate.parse(parts[3].trim())
                ));
            }
        } catch (Exception e) {
            return Response.status(400).entity("{\"error\":\"Invalid CSV: " + e.getMessage() + "\"}").build();
        }

        ExternalStatement statement = new ExternalStatement();
        statement.provider = provider;
        statement.statementDate = date;
        statement.content = toJson(lines);
        statementRepository.persist(statement);

        return Response.ok("{\"id\":" + statement.id + ",\"lines\":" + lines.size() + "}").build();
    }

    @POST
    @Path("/reconcile")
    @Produces(MediaType.APPLICATION_JSON)
    public ReconciliationRunResponse triggerReconciliation(@QueryParam("date") String date) {
        LocalDate runDate = date != null ? LocalDate.parse(date) : LocalDate.now().minusDays(1);
        ReconciliationRun run = reconciliationService.runForDate(runDate);
        return new ReconciliationRunResponse(run.id, run.runDate, run.status, run.summary, run.createdAt);
    }

    @GET
    @Path("/runs")
    @Produces(MediaType.APPLICATION_JSON)
    public List<ReconciliationRunResponse> listRuns(@QueryParam("limit") @DefaultValue("20") int limit) {
        return reconciliationService.listRuns(limit);
    }

    @GET
    @Path("/runs/{runId}/matches")
    @Produces(MediaType.APPLICATION_JSON)
    public List<ReconciliationMatchResponse> listMatches(@PathParam("runId") Long runId) {
        return reconciliationService.listMatches(runId);
    }

    @GET
    @Path("/runs/{runId}/exceptions")
    @Produces(MediaType.APPLICATION_JSON)
    public List<ReconciliationExceptionResponse> listExceptions(@PathParam("runId") Long runId) {
        return reconciliationService.listExceptions(runId);
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }
}
