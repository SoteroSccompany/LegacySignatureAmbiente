package br.com.signatureexperts.signserver;

import java.util.Map;

import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.ASN1OctetString;
import org.bouncycastle.asn1.DEROctetString;
import org.bouncycastle.asn1.DERIA5String;
import org.bouncycastle.asn1.cms.AttributeTable;
import org.bouncycastle.asn1.esf.OtherHashAlgAndValue;
import org.bouncycastle.asn1.esf.SigPolicyQualifierInfo;
import org.bouncycastle.asn1.esf.SigPolicyQualifiers;
import org.bouncycastle.asn1.esf.SignaturePolicyId;
import org.bouncycastle.asn1.esf.SignaturePolicyIdentifier;
import org.bouncycastle.asn1.nist.NISTObjectIdentifiers;
import org.bouncycastle.asn1.pkcs.PKCSObjectIdentifiers;
import org.bouncycastle.asn1.x509.AlgorithmIdentifier;
import org.bouncycastle.cms.CMSAttributeTableGenerationException;
import org.bouncycastle.cms.CMSAttributeTableGenerator;
import org.bouncycastle.cms.DefaultSignedAttributeTableGenerator;
import org.bouncycastle.util.encoders.Hex;

/**
 * Gera a tabela de atributos assinados padrão do CMSSigner (content-type,
 * message-digest — via {@link DefaultSignedAttributeTableGenerator}) e
 * acrescenta o atributo assinado {@code SignaturePolicyIdentifier}
 * (id-aa-ets-sigPolicyId) apontando para a Política de Assinatura AD-RB
 * baseada em PAdES do ITI, versão 1.3.
 *
 * Valores conferidos ao vivo em 19/09/2026 (ver L3.1 do
 * docs/relatorios/sprint-selo-icp-worm-integridade.md). Não alterar sem
 * reconferir na fonte oficial (repositorio.iti.gov.br / gov.br/iti).
 *
 * Nunca reimplementa nem substitui os atributos que o
 * {@link DefaultSignedAttributeTableGenerator} já monta — só adiciona este
 * atributo por cima, preservando tudo que o CMSSigner original já produz.
 */
public class PoliticaAdRbSignedAttributeTableGenerator implements CMSAttributeTableGenerator {

    /** OID vigente da PA_AD_RB baseada em PAdES, versão 1.3 (IN ITI nº 34/2025). */
    private static final String SIG_POLICY_OID = "2.16.76.1.7.1.11.1.3";

    /** URL da PA em linguagem de máquina (qualificador spuri). */
    private static final String SIG_POLICY_URI = "http://politicas.icpbrasil.gov.br/PA_PAdES_AD_RB_v1_3.der";

    /**
     * Hash interno da própria PA (Nota 2 do DOC-ICP-15.03) — SHA-256,
     * extraído via openssl asn1parse do .der oficial. NÃO é o hash do
     * arquivo publicado pelo ITI (esse é diferente e não deve ser usado
     * aqui).
     */
    private static final String SIG_POLICY_HASH_HEX =
            "23e4be4b9b362172e4ebb0e72b86a133ece5aad843d8651c6e38a0ba3f08fc60";

    private final DefaultSignedAttributeTableGenerator base = new DefaultSignedAttributeTableGenerator();

    @Override
    public AttributeTable getAttributes(final Map parameters) throws CMSAttributeTableGenerationException {
        AttributeTable attrs = base.getAttributes(parameters);
        return attrs.add(PKCSObjectIdentifiers.id_aa_ets_sigPolicyId, buildSignaturePolicyIdentifier());
    }

    private SignaturePolicyIdentifier buildSignaturePolicyIdentifier() {
        // AlgorithmIdentifier sem campo parameters (Nota 3 do Anexo 1 DOC-ICP-15.03).
        final AlgorithmIdentifier hashAlgorithm = new AlgorithmIdentifier(NISTObjectIdentifiers.id_sha256);
        final ASN1OctetString hashValue = new DEROctetString(Hex.decode(SIG_POLICY_HASH_HEX));
        final OtherHashAlgAndValue sigPolicyHash = new OtherHashAlgAndValue(hashAlgorithm, hashValue);

        final SigPolicyQualifierInfo spUriQualifier = new SigPolicyQualifierInfo(
                PKCSObjectIdentifiers.id_spq_ets_uri,
                new DERIA5String(SIG_POLICY_URI));
        final SigPolicyQualifiers qualifiers = new SigPolicyQualifiers(
                new SigPolicyQualifierInfo[] { spUriQualifier });

        final SignaturePolicyId signaturePolicyId = new SignaturePolicyId(
                new ASN1ObjectIdentifier(SIG_POLICY_OID),
                sigPolicyHash,
                qualifiers);

        return new SignaturePolicyIdentifier(signaturePolicyId);
    }
}
